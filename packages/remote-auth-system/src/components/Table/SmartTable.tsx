import React, { useState } from "react";
import "./SmartTable.css";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { ROLE_DISPLAY_NAMES, USER_ROLES } from "../../common/common";
import { FaPen } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
 
interface Column {
  key: string;
  label: string;
}
 
interface TableProps {
  columns: Column[];
  data: any[];
  startIndex?: number;
  actionRenderer?: (row: any) => React.ReactNode;
}
 
const SmartTable: React.FC<TableProps> = ({
  columns,
  data,
  startIndex = 0,
  actionRenderer,
}) => {
  const [tableData, setTableData] = useState<any[]>(data);
  const sensors = useSensors(useSensor(PointerSensor));
 
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
 
    if (active.id !== over?.id) {
      const oldIndex = tableData.findIndex((row) => row.id === active.id);
      const newIndex = tableData.findIndex((row) => row.id === over?.id);
      setTableData((items) => arrayMove(items, oldIndex, newIndex));
    }
  };
 
  return (
    <div className="table-wrapper">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <table className="smart-table">
          <thead>
            <tr>
              <th>S.No</th>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <SortableContext
            items={tableData.map((row) => row.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {tableData.map((row, idx) => (
                <SortableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  serialNumber={startIndex + idx + 1}
                  actionRenderer={actionRenderer}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
};
 
export default SmartTable;
 
interface SortableRowProps {
  row: any;
  columns: Column[];
  serialNumber: number;
  actionRenderer?: (row: any) => React.ReactNode;
}
const SortableRow: React.FC<SortableRowProps> = ({
  row,
  columns,
  serialNumber,
  actionRenderer,
}) => {
  const navigate = useNavigate();
 
  const {
    attributes,
    listeners, // drag listeners
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });
 
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isDragging ? "#f1f8ff" : undefined,
  };
 
  const formatValue = (key: string, value: any) => {
    if (key === "role") {
      const roleEntry = Object.entries(USER_ROLES).find(
        ([_, v]) => v === value || _ === value
      );
      const roleKey = roleEntry ? roleEntry[0] : value;
      return ROLE_DISPLAY_NAMES[roleKey as keyof typeof ROLE_DISPLAY_NAMES] || value;
    }
    return value;
  };
 
  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      {/* Drag handle only here */}
      <td {...listeners} style={{ cursor: "grab" }}>
        {serialNumber}
      </td>
 
      {/* Other table columns */}
      {columns.map((col) => (
        <td key={col.key}>{formatValue(col.key, row[col.key])}</td>
      ))}
 
      {/* Action column */}
      {actionRenderer ? (
        <td>
          {actionRenderer(row)}
        </td>
      ) : (
        <td>
          <FaPen
            onClick={(e) => {
              e.stopPropagation(); 
              navigate("/customer-master-edit", { state: row }); 
            }}
            className="edit-icon"
            style={{ cursor: "pointer" }}
          />
        </td>
      )}
    </tr>
  );
};