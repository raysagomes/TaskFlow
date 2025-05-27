import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Accordion,
  Card,
  ListGroup,
  Button,
  ProgressBar,
  Form,
  Row,
  Col,
  Spinner,
  Alert,
} from "react-bootstrap";
import { MdCheckBox, MdCheckBoxOutlineBlank } from "react-icons/md";
import Comments from "../tarefa/Comments";
import { MdEdit, MdDelete } from "react-icons/md";
import TaskHistory from "../tarefa/TaskHistory";

export default function TaskList({ boardId, user }) {
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [errorMembers, setErrorMembers] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "todo",
    assigned_to: "",
    due_date: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [tasksState, setTasksState] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);

  React.useEffect(() => {
    setTasksState(tasks);
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [boardId]);

  const formatDate = (dateString) => {
    if (!dateString) return "Não definido";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fetchTasks = () => {
    setLoadingTasks(true);
    setErrorTasks(null);
    axios
      .get(`http://localhost:3001/boards/${boardId}/tasks`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })
      .then((res) => {
        setTasks(res.data);
        setLoadingTasks(false);
      })
      .catch((err) => {
        setErrorTasks("Erro ao carregar tarefas.");
        setLoadingTasks(false);
        console.error(err);
      });
  };

  useEffect(() => {
    fetchMembers();
  }, [user.entityId]);

  const fetchMembers = () => {
    setLoadingMembers(true);
    setErrorMembers(null);
    axios
      .get(`http://localhost:3001/entities/${user.entityId}/members`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      .then((res) => {
        setMembers(res.data);
        setLoadingMembers(false);
      })
      .catch((err) => {
        setErrorMembers("Erro ao carregar membros da equipe.");
        setLoadingMembers(false);
        console.error(err);
      });
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setCreatingTask(true);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      if (editingTaskId) {
        await axios.put(
          `http://localhost:3001/tasks/${editingTaskId}`,
          {
            ...newTask,
            id: editingTaskId,
          },
          config
        );

        setTasks((prev) =>
          prev.map((task) =>
            task.id === editingTaskId ? { ...task, ...newTask } : task
          )
        );
      } else {
        const response = await axios.post(
          "http://localhost:3001/tasks",
          {
            ...newTask,
            // Removido user_id — backend já pega do token
          },
          config
        );

        setTasks((prev) => [...prev, response.data]);
      }

      setNewTask({
        title: "",
        description: "",
        status: "todo",
        assigned_to: "",
        due_date: "",
      });
      setEditingTaskId(null);
      setShowTaskForm(false);
    } catch (error) {
      if (error.response) {
        console.error("Erro resposta backend:", error.response.data);
        alert(
          `Erro ao salvar tarefa: ${
            error.response.data.error || JSON.stringify(error.response.data)
          }`
        );
      } else if (error.request) {
        console.error("Erro sem resposta:", error.request);
        alert("Erro ao salvar tarefa: sem resposta do servidor.");
      } else {
        console.error("Erro ao configurar requisição:", error.message);
        alert("Erro ao salvar tarefa: " + error.message);
      }
    }
  };

  if (loadingTasks)
    return (
      <div>
        <Spinner animation="border" /> Carregando tarefas...
      </div>
    );
  if (errorTasks) return <Alert variant="danger">{errorTasks}</Alert>;

  const getMemberNameById = (id) => {
    if (!id) return "Não atribuído";
    const member = members.find((m) => m.id === Number(id));
    return member ? member.name : "Não atribuído";
  };

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(
      (task) => task.status === "done"
    ).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  function toggleComplete(taskId) {
    if (!tasksState) return;
    const task = tasksState.find((t) => t.id === taskId);
    if (!task) return;

    const isDone = task.status === "done";

    setTasksState((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: isDone ? "todo" : "done" } : t
      )
    );

    const url = `http://localhost:3001/${taskId}/${
      isDone ? "uncomplete" : "complete"
    }`;

    axios
      .put(url, null, { headers: { Authorization: `Bearer ${user.token}` } })
      .catch(() => {
        setTasksState((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: isDone ? "done" : "todo" } : t
          )
        );
      });
  }

  const toggleAccordion = (taskId) => {
    setActiveKey(activeKey === taskId ? null : taskId);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    try {
      await axios.delete(`http://localhost:3001/tasks/${taskId}`);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      alert("Erro ao excluir a tarefa.");
    }
  };

  const handleEditTask = (task) => {
    setNewTask(task);
    setEditingTaskId(task.id);
    setShowTaskForm(true);
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <h4>Tarefas do Quadro</h4>
      <div className="mb-3">
        <strong>Progresso do Projeto:</strong>
        <ProgressBar
          now={calculateProgress()}
          label={`${calculateProgress()}%`}
        />
      </div>
      {user?.role === "admin" && !showTaskForm && (
        <Button
          className="mb-3 create-btn"
          onClick={(e) => {
            e.stopPropagation();
            setNewTask({
              title: "",
              description: "",
              status: "todo",
              assigned_to: "",
              due_date: "",
            });
            setEditingTaskId(null);
            setShowTaskForm(true);
          }}
        >
          Criar Tarefa
        </Button>
      )}

      {showTaskForm && (
        <Card className="mb-4">
          <Card.Body>
            <Form
              onSubmit={handleSaveTask}
              onClick={(e) => e.stopPropagation()}
            >
              <Form.Group controlId="taskTitle" className="mb-3">
                <Form.Label>Título da tarefa</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Título da tarefa"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  required
                  disabled={creatingTask}
                />
              </Form.Group>
              <Form.Group controlId="taskDescription" className="mb-3">
                <Form.Label>Descrição da tarefa</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Descrição da tarefa"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  required
                  disabled={creatingTask}
                />
              </Form.Group>
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group controlId="taskStatus">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={newTask.status}
                      onChange={(e) =>
                        setNewTask({ ...newTask, status: e.target.value })
                      }
                      disabled={creatingTask}
                    >
                      <option value="todo">A fazer</option>
                      <option value="in_progress">Em andamento</option>
                      <option value="done">Concluído</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group controlId="taskAssignedTo">
                    <Form.Label>Responsável</Form.Label>
                    {loadingMembers ? (
                      <div>
                        <Spinner animation="border" size="sm" /> Carregando
                        membros...
                      </div>
                    ) : errorMembers ? (
                      <Alert variant="danger">{errorMembers}</Alert>
                    ) : members.length === 0 ? (
                      <p className="text-warning">
                        Nenhum membro da equipe adicionado!
                      </p>
                    ) : (
                      <Form.Select
                        value={newTask.assigned_to}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            assigned_to: e.target.value,
                          })
                        }
                        disabled={creatingTask}
                      >
                        <option value="">-- Selecione um membro --</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group controlId="taskDueDate">
                    <Form.Label>Data de vencimento</Form.Label>
                    <Form.Control
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) =>
                        setNewTask({ ...newTask, due_date: e.target.value })
                      }
                      disabled={creatingTask}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Button variant="primary" type="submit" disabled={creatingTask}>
                {creatingTask ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />{" "}
                    {editingTaskId ? "Salvando..." : "Criando..."}
                  </>
                ) : editingTaskId ? (
                  "Salvar alterações"
                ) : (
                  "Criar tarefa"
                )}
              </Button>{" "}
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTaskForm(false);
                  setEditingTaskId(null);
                }}
                disabled={creatingTask}
              >
                Cancelar
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}

      {tasks.length === 0 ? (
        <p className="text-muted">Nenhuma tarefa encontrada.</p>
      ) : (
        <Accordion activeKey={activeKey}>
          {tasksState.map((task) => (
            <Accordion.Item eventKey={task.id} key={task.id}>
              <Accordion.Header
                onClick={() => toggleAccordion(task.id)}
                className="d-flex align-items-center"
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleComplete(task.id);
                  }}
                  style={{
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    marginRight: "8px",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      task.status === "done" ? "#4CAF50" : "transparent",
                    color: task.status === "done" ? "white" : "gray",
                    transition: "background-color 0.3s, color 0.3s",
                  }}
                  aria-label={
                    task.status === "done"
                      ? "Marcar como pendente"
                      : "Marcar como concluído"
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      toggleComplete(task.id);
                    }
                  }}
                >
                  {task.status === "done" ? (
                    <MdCheckBox />
                  ) : (
                    <MdCheckBoxOutlineBlank />
                  )}
                </span>

                <div>
                  <strong>{task.title}</strong> -{" "}
                  {task.description.length > 50
                    ? task.description.substring(0, 50) + "..."
                    : task.description}
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <Card.Text>
                  <strong>Status:</strong> {task.status.replace("_", " ")}
                </Card.Text>
                <Card.Text>
                  <strong>Responsável:</strong>{" "}
                  {getMemberNameById(task.assigned_to)}
                </Card.Text>
                <Card.Text>
                  <strong>Vencimento:</strong> {formatDate(task.due_date)}
                </Card.Text>
                <div className="d-flex justify-content-end gap-2 mt-3">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTask(task);
                    }}
                  >
                    <MdEdit /> Editar
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                  >
                    <MdDelete /> Excluir
                  </Button>
                </div>

                <Comments taskId={task.id} user={user} />
                <TaskHistory taskId={task.id} />
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </div>
  );
}
