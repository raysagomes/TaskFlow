import React, { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { FaTrash } from "react-icons/fa";

export default function AvisoCard() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!user?.entityId) return;

    axios
      .get(`http://localhost:3001/notices/${user.entityId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      .then((res) => setNotices(res.data))
      .catch(console.error);
  }, [user]);

  function handleAddNotice() {
    if (!newMessage.trim()) return;

    axios
      .post(
        `http://localhost:3001/notices`,
        {
          entityId: user.entityId,
          message: newMessage,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      )
      .then((res) => {
        setNotices((prev) => [res.data, ...prev]);
        setNewMessage("");
        setShowInput(false);
      })
      .catch(console.error);
  }
  function handleDeleteNotice(id) {
    axios
      .delete(`http://localhost:3001/notices/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      .then(() => {
        setNotices((prev) => prev.filter((n) => n.id !== id));
      })
      .catch(console.error);
  }

  return (
    <div className="aviso-card">
      <h3 className="aviso-title">Avisos</h3>

      <ul className="aviso-list">
        {notices.length === 0 && <li>Sem avisos no momento.</li>}
        {notices.map((n) => (
          <li key={n.id} className="aviso-item">
            <span className="aviso-message">{n.message}</span>
            {user?.role === "admin" && (
              <button
                onClick={() => handleDeleteNotice(n.id)}
                className="delete-btn"
                title="Deletar aviso"
              >
                <FaTrash />
              </button>
            )}
          </li>
        ))}
      </ul>

      {user?.role === "admin" && (
        <>
          {showInput ? (
            <div className="aviso-input-group">
              <input
                type="text"
                placeholder="Digite o aviso..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="aviso-input"
              />
              <div>
                <button
                  onClick={handleAddNotice}
                  className="aviso-btn save-btn"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setShowInput(false)}
                  className="aviso-btn cancel-btn"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="aviso-add-btn"
              aria-label="Adicionar aviso"
              title="Adicionar aviso"
            >
              <FiPlus />
            </button>
          )}
        </>
      )}
    </div>
  );
}
