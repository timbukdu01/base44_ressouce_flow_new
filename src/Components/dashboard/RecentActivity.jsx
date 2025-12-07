import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Clock, User, Briefcase } from "lucide-react";

export default function RecentActivity({ resources, tasks }) {
    const activities = [
        ...resources.slice(0, 3).map(r => ({
            type: "resource",
            icon: User,
            title: r.name,
            subtitle: `Neue Ressource: ${r.type === "employee" ? "Mitarbeiter" : r.type === "room" ? "Raum" : "Gerät"}`,
            date: r.created_date,
            color: "bg-blue-100 text-blue-700"
        })),
        ...tasks.slice(0, 3).map(t => ({
            type: "task",
            icon: Briefcase,
            title: t.title,
            subtitle: `Status: ${t.status === "planned" ? "Geplant" : t.status === "in_progress" ? "In Bearbeitung" : "Abgeschlossen"}`,
            date: t.created_date,
            color: "bg-orange-100 text-orange-700"
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    return (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Letzte Aktivitäten
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Noch keine Aktivitäten</p>
                    ) : (
                        activities.map((activity, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                <div className={`w-10 h-10 ${activity.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <activity.icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 text-sm truncate">{activity.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{activity.subtitle}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {format(new Date(activity.date), "dd. MMM yyyy, HH:mm", { locale: de })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}