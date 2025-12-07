
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, MapPin, Wrench, Edit, Trash2, MapPinIcon, Phone } from "lucide-react";
import { motion } from "framer-motion";

const typeConfig = {
    employee: { icon: User, label: "Mitarbeiter", color: "bg-blue-100 text-blue-700", iconBg: "bg-blue-500" },
    room: { icon: MapPin, label: "Raum", color: "bg-green-100 text-green-700", iconBg: "bg-green-500" },
    equipment: { icon: Wrench, label: "Gerät", color: "bg-purple-100 text-purple-700", iconBg: "bg-purple-500" }
};

const statusConfig = {
    available: { label: "Verfügbar", color: "bg-green-100 text-green-800 border-green-200" },
    in_use: { label: "In Nutzung", color: "bg-blue-100 text-blue-800 border-blue-200" },
    maintenance: { label: "Wartung", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    unavailable: { label: "Nicht verfügbar", color: "bg-red-100 text-red-800 border-red-200" }
};

export default function ResourceCard({ resource, onEdit, onDelete, index, readOnly = false }) {
    const type = typeConfig[resource.type] || typeConfig.employee;
    const status = statusConfig[resource.status] || statusConfig.available;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm overflow-hidden group">
                <div className={`h-2 ${type.iconBg}`} />
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 ${type.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <type.icon className="w-7 h-7 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-bold text-gray-900 text-lg truncate">{resource.name}</h3>
                                {!readOnly && (onEdit || onDelete) && (
                                    <div className="flex gap-1 flex-shrink-0">
                                        {onEdit && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                                onClick={() => onEdit(resource)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => onDelete(resource.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                <Badge className={type.color} variant="secondary">
                                    {type.label}
                                </Badge>
                                <Badge className={`${status.color} border`} variant="outline">
                                    {status.label}
                                </Badge>
                            </div>

                            {resource.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{resource.description}</p>
                            )}

                            <div className="space-y-2">
                                {resource.location && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <MapPinIcon className="w-4 h-4" />
                                        <span>{resource.location}</span>
                                    </div>
                                )}

                                {resource.contact_info && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Phone className="w-4 h-4" />
                                        <span>{resource.contact_info}</span>
                                    </div>
                                )}

                                {resource.capacity && (
                                    <div className="text-sm text-gray-500">
                                        <span className="font-medium">Kapazität:</span> {resource.capacity}
                                    </div>
                                )}

                                {resource.skills && resource.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {resource.skills.map((skill, i) => (
                                            <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
