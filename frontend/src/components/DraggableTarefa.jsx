import React from "react";
import { useDraggable } from "@dnd-kit/core";
import "./styles.css";

const DraggableTarefa = ({ tarefa, render }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: tarefa.id.toString(),
  });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
  };
  const dragHandleProps = {
    ...listeners,
    ...attributes,
  };

  return (
    <div ref={setNodeRef} style={style} className="draggable-tarefa">
      {render(tarefa, dragHandleProps)}
    </div>
  );
};

export default DraggableTarefa;
