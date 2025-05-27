const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const { sendEmail, getTaskAssignedTemplate } = require("./utils/emailService");
const cron = require("node-cron");

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//realmente envia email de alerta de tarefas entao para nao dar problema é melhor comentar
//  cron.schedule("5 14 * * *", async () => {
//   console.log("🔔 Rodando alerta automático de prazos de tarefas...");

//   try {
//     const [tasks] = await db.promise().query(
//       `SELECT t.id, t.title, t.description, t.due_date, u.email, u.first_name
//        FROM tasks t
//        JOIN users u ON t.assigned_to = u.id
//        WHERE t.due_date IS NOT NULL
//          AND t.due_date >= NOW()
//          AND t.due_date <= NOW() + INTERVAL 3 DAY`
//     );

//     if (tasks.length === 0) {
//       console.log("Nenhuma tarefa com prazo próximo.");
//       return;
//     }

//     const tasksByUser = {};
//     tasks.forEach((task) => {
//       const email = task.email;
//       if (!tasksByUser[email]) {
//         tasksByUser[email] = {
//           firstName: task.first_name || "Usuário",
//           tasks: [],
//         };
//       }
//       tasksByUser[email].tasks.push(task);
//     });

//     for (const email in tasksByUser) {
//       const { firstName, tasks } = tasksByUser[email];

//       let message = `Olá ${firstName},\n\nEste é um email de teste enviado para o endereço ${email}.\nPor favor, ignore este email e não responda.\n\nObrigado!\n\nTaskFlow\n\n`;

//       message += `Você tem as seguintes tarefas com prazo para os próximos 3 dias:\n\n`;
//       tasks.forEach((task) => {
//         const dueDate = new Date(task.due_date).toISOString().slice(0, 10);
//         message += `- ${task.title} (prazo: ${dueDate})\n  Descrição: ${task.description}\n\n`;
//       });

//       message += "Por favor, acesse o sistema para mais detalhes.\n\nTaskFlow";

//       await sendEmail(email, "Alerta de tarefas próximas (Email de teste)", message);
//     }

//     console.log(
//       `✅ Enviados alertas para ${Object.keys(tasksByUser).length} usuários.`
//     );
//   } catch (err) {
//     console.error("Erro ao enviar alertas de tarefas:", err);
//   }
// });

app.post("/register", async (req, res) => {
  const { first_name, last_name, email, password, role, newEntityName } =
    req.body;

  if (role !== "admin") {
    return res.status(400).json({
      error: "Somente administradores podem se registrar diretamente.",
    });
  }

  if (!newEntityName || newEntityName.trim() === "") {
    return res.status(400).json({
      error: "Nome da nova entidade é obrigatório para administradores.",
    });
  }

  try {
    const [entityResult] = await db
      .promise()
      .query("INSERT INTO entities (name) VALUES (?)", [newEntityName.trim()]);
    const associatedEntityId = entityResult.insertId;

    const hash = await bcrypt.hash(password, 10);

    await db
      .promise()
      .query(
        `INSERT INTO users (first_name, last_name, email, password, role, entity_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [first_name, last_name, email, hash, "admin", associatedEntityId]
      );

    res.json({
      message: "Usuário registrado e associado à entidade com sucesso",
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Email já está em uso" });
    }
    return res.status(500).json({ error: "Erro ao registrar usuário" });
  }
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err)
        return res.status(500).json({ error: "Erro interno no servidor" });
      if (results.length === 0)
        return res.status(401).json({ error: "Usuário não encontrado" });

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: "Senha incorreta" });

      const entityId = user.entity_id;
      if (!entityId)
        return res
          .status(401)
          .json({ error: "Usuário sem entidade associada" });

      const token = jwt.sign(
        { id: user.id, role: user.role, entityId },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login realizado com sucesso",
        token,
        role: user.role,
        entityId,
        userId: user.id,
      });
    }
  );
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Token não enviado" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token mal formatado" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ error: "Token inválido ou expirado" });
    req.user = user;
    console.log(req.user);
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.sendStatus(403);
  next();
}

function verifyTokenAndAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso negado: Admins somente" });
    }
    next();
  });
}

app.get("/admin/members", authenticateToken, isAdmin, async (req, res) => {
  try {
    const [results] = await db
      .promise()
      .query(
        "SELECT id, first_name, last_name, email FROM users WHERE role = 'member'"
      );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar membros" });
  }
});

app.get("/admin/entities", authenticateToken, isAdmin, async (req, res) => {
  try {
    const [results] = await db.promise().query("SELECT * FROM entities");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar entidades" });
  }
});

app.post("/admin/entities", authenticateToken, isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name)
    return res.status(400).json({ error: "Nome da entidade é obrigatório" });

  try {
    const [result] = await db
      .promise()
      .query("INSERT INTO entities (name) VALUES (?)", [name]);
    res.json({
      message: "Entidade adicionada com sucesso",
      entityId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao adicionar entidade" });
  }
});

app.post("/admin/associate", authenticateToken, isAdmin, async (req, res) => {
  const { userId, entityId } = req.body;
  if (!userId || !entityId)
    return res.status(400).json({ error: "Dados incompletos" });

  try {
    await db
      .promise()
      .query("UPDATE users SET entity_id = ? WHERE id = ?", [entityId, userId]);
    res.json({ message: "Associação feita com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao associar membro à entidade" });
  }
});

app.get("/entity/:id/data", authenticateToken, async (req, res) => {
  const userEntityId = req.user.entityId;
  const entityIdParam = parseInt(req.params.id, 10);

  if (userEntityId !== entityIdParam) {
    return res.status(403).json({ error: "Acesso negado à entidade" });
  }

  try {
    const [data] = await db
      .promise()
      .query("SELECT * FROM entities WHERE id = ?", [entityIdParam]);
    if (!data[0])
      return res.status(404).json({ error: "Entidade não encontrada" });

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar dados da entidade" });
  }
});

app.get("/members", authenticateToken, (req, res) => {
  const entityId = req.user.entityId;
  const userId = req.user.id;

  const sql =
    "SELECT id, first_name, last_name, email FROM users WHERE entity_id = ? AND id != ?";

  db.query(sql, [entityId, userId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar membros:", err);
      return res.status(500).json({ error: "Erro ao buscar membros" });
    }

    if (results.length === 0) {
      return res.json([
        { id: 0, first_name: "Nenhuma outra pessoa na equipe" },
      ]);
    }

    res.json(results);
  });
});

app.post("/create-member", authenticateToken, isAdmin, async (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  const adminId = req.user.id;

  try {
    const [adminResult] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [adminId]);
    const admin = adminResult[0];

    if (!admin || !admin.entity_id) {
      return res.status(400).json({ error: "Admin sem entidade associada" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db
      .promise()
      .query(
        `INSERT INTO users (email, password, role, entity_id, first_name, last_name) VALUES (?, ?, 'member', ?, ?, ?)`,
        [email, hashedPassword, admin.entity_id, first_name, last_name]
      );

    res.status(201).json({ message: "Membro criado com sucesso" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Email já está em uso" });
    }
    res.status(500).json({ error: "Erro ao criar membro" });
  }
});

app.get("/projects", authenticateToken, async (req, res) => {
  const userEntityId = req.user.entityId;

  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT * FROM boards WHERE entity_id = ? ORDER BY created_at DESC",
        [userEntityId]
      );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar quadros" });
  }
});

app.post("/projects", authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  const userEntityId = req.user.entityId;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ error: "Nome do projeto é obrigatório" });
  }

  try {
    const [result] = await db.promise().query(
      `INSERT INTO boards (title, description, entity_id, created_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [name, description || "", userEntityId, userId]
    );

    const [rows] = await db
      .promise()
      .query("SELECT * FROM boards WHERE id = ?", [result.insertId]);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar quadro" });
  }
});

async function canAccessTask(req, res, next) {
  const taskId = req.params.taskId;
  const userEntityId = req.user.entityId;

  try {
    const tasks = await db.promise().query(
      `SELECT t.id FROM tasks t
       JOIN boards p ON t.board_id = p.id
       WHERE t.id = ? AND p.entity_id = ?`,
      [taskId, userEntityId]
    );

    if (tasks.length === 0) {
      return res.status(403).json({ error: "Acesso negado à tarefa." });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
}
app.get("/boards/:boardId/tasks", authenticateToken, async (req, res) => {
  const boardId = req.params.boardId;
  const userEntityId = req.user.entityId;

  try {
    const [boards] = await db
      .promise()
      .query("SELECT id FROM boards WHERE id = ? AND entity_id = ?", [
        boardId,
        userEntityId,
      ]);
    if (boards.length === 0) {
      return res.status(403).json({ error: "Acesso negado ao quadro." });
    }

    const [tasks] = await db
      .promise()
      .query("SELECT * FROM tasks WHERE board_id = ?", [boardId]);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar tarefas." });
  }
});

app.get(
  "/tasks/:taskId/comments",
  authenticateToken,
  canAccessTask,
  async (req, res) => {
    const taskId = req.params.taskId;
    try {
      const [comments] = await db.promise().query(
        `SELECT c.id, c.comment_text, c.created_at, c.attachment_url, CONCAT(u.first_name, ' ', u.last_name) AS user_name
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.task_id = ?
         ORDER BY c.created_at ASC`,
        [taskId]
      );

      res.json(comments);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao buscar comentários." });
    }
  }
);

app.post(
  "/tasks/:taskId/comments",
  authenticateToken,
  canAccessTask,
  upload.single("attachment"),
  async (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.user.id;
    const { comment_text } = req.body;
    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!comment_text && !attachmentUrl) {
      return res
        .status(400)
        .json({ error: "Comentário ou anexo obrigatório." });
    }

    try {
      const [result] = await db
        .promise()
        .query(
          `INSERT INTO comments (task_id, user_id, comment_text, attachment_url) VALUES (?, ?, ?, ?)`,
          [taskId, userId, comment_text, attachmentUrl]
        );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao criar comentário." });
    }
  }
);

app.get("/entities/:entityId/members", authenticateToken, (req, res) => {
  const requestedEntityId = Number(req.params.entityId);
  const userEntityId = req.user.entityId;

  if (requestedEntityId !== userEntityId) {
    return res.status(403).json({ message: "Acesso negado à entidade." });
  }

  const sql = "SELECT id, first_name AS name FROM users WHERE entity_id = ?";

  db.query(sql, [requestedEntityId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar membros da entidade:", err);
      return res
        .status(500)
        .json({ error: "Erro ao buscar membros da entidade" });
    }

    res.json(results);
  });
});

app.post("/boards/:boardId/tasks", authenticateToken, async (req, res) => {
  const boardId = req.params.boardId;
  const userEntityId = req.user.entityId;

  const { title, description, status, assigned_to, due_date } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .json({ error: "Título e descrição são obrigatórios." });
  }

  try {
    const [boards] = await db
      .promise()
      .query("SELECT id FROM boards WHERE id = ? AND entity_id = ?", [
        boardId,
        userEntityId,
      ]);

    if (boards.length === 0) {
      return res.status(403).json({ error: "Acesso negado ao quadro." });
    }

    const [result] = await db.promise().query(
      `INSERT INTO tasks 
       (board_id, title, description, status, assigned_to, due_date, entity_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        boardId,
        title,
        description,
        status || "todo",
        assigned_to || null,
        due_date || null,
        userEntityId,
      ]
    );

    if (assigned_to) {
      const [userRows] = await db
        .promise()
        .query("SELECT email, first_name FROM users WHERE id = ?", [
          assigned_to,
        ]);

      if (userRows.length > 0) {
        const email = userRows[0].email;
        const nome = userRows[0].first_name || "Responsável";

        const html = getTaskAssignedTemplate({
          nome,
          titulo: title,
          descricao: description,
        });

        await sendEmail(
          email,
          `Nova tarefa atribuída: ${title}`,
          `Olá ${nome},\n\nVocê foi designado para a tarefa: "${title}".\nDescrição: ${description}.`,
          html
        );
      }
    }

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar tarefa." });
  }
});

function formatDateForMySQL(isoDate) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().slice(0, 19).replace("T", " ");
}
app.put("/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    board_id,
    title,
    description,
    status,
    assigned_to,
    due_date,
    entity_id,
  } = req.body;

  const user_id = req.user.id;
  if (!user_id) {
    return res.status(400).json({ error: "Usuário (user_id) não informado" });
  }

  try {
    const [currentRows] = await db
      .promise()
      .query("SELECT * FROM tasks WHERE id = ?", [id]);
    const currentTask = currentRows[0];

    if (!currentTask) {
      return res.status(404).json({ error: "Tarefa não encontrada" });
    }

    const changes = [];

    // Comparações simples, tratando due_date com formato ISO
    if (title !== currentTask.title) {
      changes.push({
        field: "title",
        oldValue: currentTask.title,
        newValue: title,
      });
    }
    if (description !== currentTask.description) {
      changes.push({
        field: "description",
        oldValue: currentTask.description,
        newValue: description,
      });
    }
    if (status !== currentTask.status) {
      changes.push({
        field: "status",
        oldValue: currentTask.status,
        newValue: status,
      });
    }
    if (assigned_to !== currentTask.assigned_to) {
      changes.push({
        field: "assigned_to",
        oldValue: currentTask.assigned_to,
        newValue: assigned_to,
      });
    }

    // Para due_date, converter para string MySQL para comparar corretamente
    const currentDueDateFormatted = currentTask.due_date
      ? formatDateForMySQL(currentTask.due_date)
      : null;
    const newDueDateFormatted = due_date ? formatDateForMySQL(due_date) : null;

    if (newDueDateFormatted !== currentDueDateFormatted) {
      changes.push({
        field: "due_date",
        oldValue: currentDueDateFormatted,
        newValue: newDueDateFormatted,
      });
    }

    await db
      .promise()
      .query(
        `UPDATE tasks SET board_id=?, title=?, description=?, status=?, assigned_to=?, due_date=?, entity_id=? WHERE id=?`,
        [
          board_id,
          title,
          description,
          status,
          assigned_to,
          newDueDateFormatted,
          entity_id,
          id,
        ]
      );

    if (changes.length > 0) {
      await saveTaskHistory(id, user_id, changes);
    }

    res.status(200).json({ message: "Tarefa atualizada" });
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    res.status(500).json({ error: "Erro ao atualizar tarefa" });
  }
});

const saveTaskHistory = async (taskId, userId, changes) => {
  const values = changes.map((change) => [
    taskId,
    userId,
    change.field,
    change.oldValue,
    change.newValue,
  ]);

  const sql = `INSERT INTO task_history (task_id, changed_by, field_changed, old_value, new_value) VALUES ?`;

  await db.promise().query(sql, [values]);
};

app.get("/tasks/:id/history", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query(
      `SELECT th.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name
       FROM task_history th
       JOIN users u ON th.changed_by = u.id
       WHERE task_id = ?
       ORDER BY changed_at DESC`,
      [id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

app.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db
      .promise()
      .query(
        "SELECT id, first_name, last_name, email FROM users WHERE id = ?",
        [userId]
      );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar dados do usuário" });
  }
});

app.put("/:id/complete", async (req, res) => {
  const { id } = req.params;
  try {
    await db
      .promise()
      .query("UPDATE tasks SET status = 'done' WHERE id = ?", [id]);
    res.status(200).json({ message: "Tarefa marcada como concluída" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao marcar tarefa como concluída" });
  }
});

app.put("/:id/uncomplete", async (req, res) => {
  const { id } = req.params;
  try {
    await db
      .promise()
      .query("UPDATE tasks SET status = 'todo' WHERE id = ?", [id]);
    res.status(200).json({ message: "Tarefa desmarcada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao desmarcar tarefa" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
