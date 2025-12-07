import React from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, icon: Icon, color, subtitle, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
                <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${color} rounded-full opacity-10`} />
                <div className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                            <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
                            {subtitle && (
                                <p className="text-xs text-gray-500">{subtitle}</p>
                            )}
                        </div>
                        <div className={`p-4 rounded-2xl ${color} bg-opacity-15 shadow-inner`}>
                            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}