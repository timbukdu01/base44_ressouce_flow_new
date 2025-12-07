import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, User, Eye, Settings, RefreshCw, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const roleConfig = {
    admin: {
        label: "Administrator",
        icon: Shield,
        color: "bg-red-100 text-red-700",
        description: "Vollzugriff"
    },
    project_manager: {
        label: "Projektleiter",
        icon: Settings,
        color: "bg-blue-100 text-blue-700",
        description: "Planung & Verwaltung"
    },
    team_member: {
        label: "Teammitglied",
        icon: User,
        color: "bg-green-100 text-green-700",
        description: "Standard Zugriff"
    },
    viewer: {
        label: "Betrachter",
        icon: Eye,
        color: "bg-gray-100 text-gray-700",
        description: "Nur Ansehen"
    }
};

export default function RoleSwitcher({ currentUser, onRoleChange }) {
    const [isChanging, setIsChanging] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const currentRole = currentUser?.role_type || "team_member";
    const currentConfig = roleConfig[currentRole] || roleConfig.team_member;
    const CurrentIcon = currentConfig.icon;

    const handleRoleChange = async (newRole) => {
        if (newRole === currentRole) return;

        setIsChanging(true);
        try {
            await base44.auth.updateMe({ role_type: newRole });
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error("Error changing role:", error);
            setIsChanging(false);
        }
    };

    return (
        <div className="relative">
            {showSuccess && (
                <div className="absolute -top-16 left-0 right-0 z-50">
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                            Rolle erfolgreich gewechselt! Seite wird neu geladen...
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-3 hover:bg-orange-50 transition-colors"
                        disabled={isChanging}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentConfig.color}`}>
                            <CurrentIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="font-semibold text-sm truncate">
                                {currentUser?.full_name || currentUser?.email || "Benutzer"}
                            </p>
                            <p className="text-xs text-gray-500">{currentConfig.label}</p>
                        </div>
                        {isChanging ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                            <RefreshCw className="w-4 h-4 text-gray-400" />
                        )}
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-xs text-gray-500">
                        Rolle wechseln
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {Object.entries(roleConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        const isActive = key === currentRole;

                        return (
                            <DropdownMenuItem
                                key={key}
                                onClick={() => handleRoleChange(key)}
                                disabled={isActive || isChanging}
                                className={`cursor-pointer ${isActive ? 'bg-orange-50' : ''}`}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{config.label}</p>
                                        <p className="text-xs text-gray-500">{config.description}</p>
                                    </div>
                                    {isActive && (
                                        <CheckCircle className="w-4 h-4 text-orange-600" />
                                    )}
                                </div>
                            </DropdownMenuItem>
                        );
                    })}

                    <DropdownMenuSeparator />

                    <div className="px-2 py-2">
                        <p className="text-xs text-gray-500 italic">
                            Wechseln Sie die Rolle, um verschiedene Ansichten zu testen
                        </p>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}