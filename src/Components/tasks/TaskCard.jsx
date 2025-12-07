
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Edit, Trash2, Calendar, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";

const priorityConfig = {
    low: { label: "Niedrig", color: "bg-gray-100 text-gray-700 border-gray-200" },
    medium: { label: "Mittel", color: "bg-blue-100 text-blue-700 border-blue-200" },
    high: { label: "Hoch", color: "bg-orange-100 text-orange-700 border-orange-200" },
    urgent: { label: "Dringend", color: "bg-red-100 text-red-700 border-red-200" }
};

const statusConfig = {
    planned: { label: "Geplant", color: "bg-gray-100 text-gray-800" },
    in_progress: { label: "In Bearbeitung", color: "bg-blue-100 text-blue-800" },
    completed: { label: "Abgeschlossen", color: "bg-green-100 text-green-800" },
    cancelled: { label: "Abgebrochen", color: "bg-red-100 text-red-800" }
};

const effortUnitLabels = {
    hours: "Std.",
    days: "Tage",
    weeks: "Wochen"
};

export default function TaskCard({ task, resources, onEdit, onDelete, index, readOnly = false }) {
    const priority = priorityConfig[task.priority] || priorityConfig.medium;
    const status = statusConfig[task.status] || statusConfig.planned;

    const assignedResourceNames = task.assigned_resources
        ?.map(id => resources.find(r => r.id === id)?.name)
        .filter(Boolean) || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-900 text-lg flex-1 mr-2">{task.title}</h3>
                        {!readOnly && (onEdit || onDelete) && (
                            <div className="flex gap-1 flex-shrink-0">
                                {onEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                        onClick={() => onEdit(task)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                )}
                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                        onClick={() => onDelete(task.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className={status.color} variant="secondary">
                            {status.label}
                        </Badge>
                        <Badge className={`${priority.color} border`} variant="outline">
                            {priority.label}
                        </Badge>
                        {task.effort && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                <Clock className="w-3 h-3 mr-1" />
                                {task.effort} {effortUnitLabels[task.effort_unit] || task.effort_unit}
                            </Badge>
                        )}
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{task.description}</p>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {format(new Date(task.start_date), "dd.MM.yyyy", { locale: de })} - {format(new Date(task.end_date), "dd.MM.yyyy", { locale: de })}
                            </span>
                        </div>

                        {assignedResourceNames.length > 0 && (
                            <div className="flex items-start gap-2 text-sm text-gray-500">
                                <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <span className="font-medium text-gray-700">Zugewiesen:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {assignedResourceNames.map((name, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {task.status !== "completed" && task.status !== "cancelled" && (
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Fortschritt</span>
                                    <span className="font-medium text-gray-900">{task.progress || 0}%</span>
                                </div>
                                <Progress value={task.progress || 0} className="h-2" />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
