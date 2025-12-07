import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function ResourceDistribution({ resources }) {
    const distribution = [
        {
            name: "Mitarbeiter",
            value: resources.filter(r => r.type === "employee").length,
            color: "#3B82F6"
        },
        {
            name: "Räume",
            value: resources.filter(r => r.type === "room").length,
            color: "#10B981"
        },
        {
            name: "Geräte",
            value: resources.filter(r => r.type === "equipment").length,
            color: "#8B5CF6"
        }
    ].filter(item => item.value > 0);

    if (distribution.length === 0) {
        return null;
    }

    return (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900">Ressourcen-Verteilung</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie
                            data={distribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {distribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}