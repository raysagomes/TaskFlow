import React, { useState, useEffect } from "react";
import ColunaTarefas from "../ColunaTarefas";
import TarefaModal from "../TarefaModal";
import { Container, Row } from "react-bootstrap";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

const QuadroTarefas = ({ idDoQuadro }) => {
  const [tarefas, setTarefas] = useState({
    atribuido: [],
    fazendo: [],
    feito: [],
  });

  const [modalAberto, setModalAberto] = useState(false);
  const [colunaAtual, setColunaAtual] = useState(null);
  const [tarefaEditando, setTarefaEditando] = useState(undefined);

  const docRef = doc(db, "quadros", idDoQuadro);

  useEffect(() => {
    async function carregarTarefas() {
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (
            data &&
            typeof data === "object" &&
            "atribuido" in data &&
            "fazendo" in data &&
            "feito" in data
          ) {
            setTarefas({
              atribuido: data.atribuido || [],
              fazendo: data.fazendo || [],
              feito: data.feito || [],
            });
          }
        }
      } catch (error) {
        console.error("Erro ao carregar tarefas do Firestore:", error);
      }
    }
    carregarTarefas();
  }, [docRef]);

  useEffect(() => {
    async function salvarTarefas() {
      try {
        await setDoc(docRef, tarefas);
      } catch (error) {
        console.error("Erro ao salvar tarefas no Firestore:", error);
      }
    }
    salvarTarefas();
  }, [tarefas, docRef]);

  const abrirModalAdicionar = (coluna) => {
    setColunaAtual(coluna);
    setTarefaEditando(undefined);
    setModalAberto(true);
  };

  const abrirModalEditar = (coluna, tarefa) => {
    setColunaAtual(coluna);
    setTarefaEditando(tarefa);
    setModalAberto(true);
  };

  const salvarTarefa = (tarefaInput) => {
    if (!colunaAtual) return;

    setTarefas((prev) => {
      const coluna = prev[colunaAtual];
      if (tarefaInput.id) {
        return {
          ...prev,
          [colunaAtual]: coluna.map((t) =>
            t.id === tarefaInput.id ? { ...tarefaInput, id: tarefaInput.id } : t
          ),
        };
      } else {
        const novaTarefa = {
          id: Date.now(),
          ...tarefaInput,
        };
        return {
          ...prev,
          [colunaAtual]: [...coluna, novaTarefa],
        };
      }
    });
    setModalAberto(false);
  };

  const removerTarefa = (coluna, id) => {
    setTarefas((prev) => ({
      ...prev,
      [coluna]: prev[coluna].filter((t) => t.id !== id),
    }));
  };

  const moverTarefaManual = (id, direcao, colunaAtual) => {
    const ordem = ["atribuido", "fazendo", "feito"];
    const indiceAtual = ordem.indexOf(colunaAtual);
    const novoIndice =
      direcao === "esquerda"
        ? Math.max(0, indiceAtual - 1)
        : Math.min(ordem.length - 1, indiceAtual + 1);
    const novaColuna = ordem[novoIndice];

    if (colunaAtual === novaColuna) return;

    const tarefaMovida = tarefas[colunaAtual].find((t) => t.id === id);
    if (!tarefaMovida) return;

    setTarefas((prev) => {
      const atualizadas = { ...prev };
      atualizadas[colunaAtual] = atualizadas[colunaAtual].filter(
        (t) => t.id !== id
      );
      atualizadas[novaColuna] = [...atualizadas[novaColuna], tarefaMovida];
      return atualizadas;
    });
  };

  const sensores = useSensors(useSensor(PointerSensor));

  const moverTarefa = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    let origemColuna = null;
    let tarefaMovida;

    for (const coluna of Object.keys(tarefas)) {
      const tarefa = tarefas[coluna].find((t) => t.id.toString() === active.id);
      if (tarefa) {
        origemColuna = coluna;
        tarefaMovida = tarefa;
        break;
      }
    }
    if (!origemColuna || !tarefaMovida) return;

    const destinoColuna = Object.keys(tarefas).find((col) =>
      tarefas[col].some((t) => t.id.toString() === over.id)
    );

    if (!destinoColuna) return;

    if (origemColuna === destinoColuna) return;

    setTarefas((prev) => {
      const origem = prev[origemColuna].filter((t) => t.id !== tarefaMovida.id);
      const destino = [...prev[destinoColuna], tarefaMovida];

      return {
        ...prev,
        [origemColuna]: origem,
        [destinoColuna]: destino,
      };
    });
  };

  return (
    <>
      <Container fluid>
        <Row>
          <ColunaTarefas
            titulo="Atribuído"
            tarefas={tarefas.atribuido}
            onAdicionar={() => abrirModalAdicionar("atribuido")}
            onEditar={(id) => {
              const tarefa = tarefas.atribuido.find((t) => t.id === id);
              abrirModalEditar("atribuido", tarefa);
            }}
            onRemover={(id) => removerTarefa("atribuido", id)}
            onMover={moverTarefaManual}
            colunaId="atribuido"
          />
          <ColunaTarefas
            titulo="Fazendo"
            tarefas={tarefas.fazendo}
            onAdicionar={() => abrirModalAdicionar("fazendo")}
            onEditar={(id) => {
              const tarefa = tarefas.fazendo.find((t) => t.id === id);
              abrirModalEditar("fazendo", tarefa);
            }}
            onRemover={(id) => removerTarefa("fazendo", id)}
            onMover={moverTarefaManual}
            colunaId="fazendo"
          />
          <ColunaTarefas
            titulo="Feito"
            tarefas={tarefas.feito}
            onAdicionar={() => abrirModalAdicionar("feito")}
            onEditar={(id) => {
              const tarefa = tarefas.feito.find((t) => t.id === id);
              abrirModalEditar("feito", tarefa);
            }}
            onRemover={(id) => removerTarefa("feito", id)}
            onMover={moverTarefaManual}
            colunaId="feito"
          />
        </Row>
      </Container>

      <TarefaModal
        show={modalAberto}
        onHide={() => setModalAberto(false)}
        onSalvar={salvarTarefa}
        tarefa={tarefaEditando}
      />
    </>
  );
};

export default QuadroTarefas;
