"use client";

import { useState } from "react";
import { FormStep, FormField, FieldType } from "@ambo/database/form-types";
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Plus, GripVertical, Trash2, Settings } from "lucide-react";

// Placeholder for sub-components (will extract related logic later or inline for now)

// --- Initial State for Demo ---
const INITIAL_SCHEMA: FormStep[] = [
    {
        id: "step1",
        title: "Page 1",
        fields: [
            { id: "f1", type: "text", label: "First Name", reference: "#FirstName" }
        ]
    }
];

export default function FormBuilder() {
    const [schema, setSchema] = useState<FormStep[]>(INITIAL_SCHEMA);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const selectedField = schema
        .flatMap(step => step.fields)
        .find(f => f.id === selectedFieldId);

    // --- Handlers ---

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        // Logic for dropping (reordering or adding) goes here
        // For MVP, we'll just support adding to the end or clicking to add
    };

    const addField = (type: FieldType) => {
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type,
            label: "New Field",
            placeholder: "",
            required: false
        };

        // Add to first step for now
        setSchema(prev => {
            const newSchema = [...prev];
            newSchema[0].fields.push(newField);
            return newSchema;
        });
        setSelectedFieldId(newField.id);
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setSchema(prev => prev.map(step => ({
            ...step,
            fields: step.fields.map(f => f.id === id ? { ...f, ...updates } : f)
        })));
    };

    const deleteField = (id: string) => {
        setSchema(prev => prev.map(step => ({
            ...step,
            fields: step.fields.filter(f => f.id !== id)
        })));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            {/* LEFT: Toolbox */}
            <div className="w-64 border-r bg-background flex flex-col">
                <div className="p-4 border-b font-semibold">Toolbox</div>
                <div className="p-4 space-y-2 overflow-y-auto flex-1">
                    <ToolboxItem type="text" label="Text Input" onClick={() => addField('text')} />
                    <ToolboxItem type="textarea" label="Text Area" onClick={() => addField('textarea')} />
                    <ToolboxItem type="select" label="Select / Dropdown" onClick={() => addField('select')} />
                    <ToolboxItem type="email" label="Email" onClick={() => addField('email')} />
                    <ToolboxItem type="number" label="Number" onClick={() => addField('number')} />
                    <ToolboxItem type="info" label="Info / HTML" onClick={() => addField('info')} />
                </div>
            </div>

            {/* CENTER: Canvas */}
            <div className="flex-1 bg-muted/20 p-8 overflow-y-auto">
                <div className="max-w-2xl mx-auto bg-card border shadow-sm min-h-[500px] rounded-lg p-8">
                    <h2 className="text-xl font-bold mb-6 text-center text-muted-foreground border-b border-dashed pb-4">
                        Form Canvas
                    </h2>

                    {schema.map((step, sIdx) => (
                        <div key={step.id} className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <input
                                    value={step.title}
                                    onChange={(e) => {
                                        const newSchema = [...schema];
                                        newSchema[sIdx].title = e.target.value;
                                        setSchema(newSchema);
                                    }}
                                    className="text-lg font-semibold bg-transparent border-none focus:ring-0 px-0"
                                />
                            </div>
                            <div className="space-y-3">
                                {step.fields.map(field => (
                                    <div
                                        key={field.id}
                                        onClick={() => setSelectedFieldId(field.id)}
                                        className={cn(
                                            "relative p-4 border rounded-md cursor-pointer transition-all hover:border-brand/50 group bg-background",
                                            selectedFieldId === field.id ? "border-brand ring-1 ring-brand bg-brand/5" : "border-border"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 text-muted-foreground cursor-grab">
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium mb-1">{field.label}</div>
                                                <div className="h-8 w-full bg-muted/20 rounded border border-dashed border-border/50 flex items-center px-3 text-xs text-muted-foreground">
                                                    {field.type} input placeholder...
                                                </div>
                                                {field.reference && (
                                                    <div className="mt-1 text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full inline-block font-mono">
                                                        {field.reference}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-center">
                                <button className="text-sm text-muted-foreground hover:text-brand flex items-center justify-center w-full py-2 border border-dashed rounded-md hover:border-brand/50 hover:bg-brand/5 transition-colors">
                                    <Plus className="w-4 h-4 mr-2" /> Add a step/page
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Properties */}
            <div className="w-80 border-l bg-background flex flex-col">
                <div className="p-4 border-b font-semibold flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Properties
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    {selectedField ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Label</label>
                                <input
                                    className="glass-input w-full"
                                    value={selectedField.label}
                                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Type</label>
                                <select
                                    className="glass-input w-full"
                                    value={selectedField.type}
                                    onChange={(e) => updateField(selectedField.id, { type: e.target.value as FieldType })}
                                >
                                    <option value="text">Text</option>
                                    <option value="textarea">Text Area</option>
                                    <option value="select">Select</option>
                                    <option value="email">Email</option>
                                    <option value="number">Number</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Reference ID</label>
                                <div className="text-[10px] text-muted-foreground mb-1">
                                    Use this code to pipe answers (e.g., #FirstName).
                                </div>
                                <input
                                    className="glass-input w-full font-mono text-sm"
                                    placeholder="#Example"
                                    value={selectedField.reference || ""}
                                    onChange={(e) => updateField(selectedField.id, { reference: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Placeholder</label>
                                <input
                                    className="glass-input w-full"
                                    value={selectedField.placeholder || ""}
                                    onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedField.required}
                                    onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                                    id="required-check"
                                />
                                <label htmlFor="required-check" className="text-sm">Required Field</label>
                            </div>

                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            Select a field to edit its properties.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ToolboxItem({ type, label, onClick }: { type: string, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:border-brand hover:shadow-sm transition-all text-left group"
        >
            <div className="bg-muted p-2 rounded group-hover:bg-brand/10 group-hover:text-brand">
                <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}
