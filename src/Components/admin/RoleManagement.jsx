import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, User, Eye, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const roleConfig = {
    admin: {
        label: "Administrator",
        icon: Shield,
        color: "bg-red-100 text-red-700 border-red-200",
        description: "Vollzugriff auf alle Funktionen"
    },
    project_manager: {
        label: "Projektleiter",
        icon: Settings,
        color: "bg-blue-100 text-blue-700 border-blue-200",
        description: "Planung, Ressourcen und Aufgaben verwalten"
    },
    team_member: {
        label: "Teammitglied",
        icon: User,
        color: "bg-green-100 text-green-700 border-green-200",
        description: "Eigene Aufgaben ansehen und bearbeiten"
    },
    viewer: {
        label: "Betrachter",
        icon: Eye,
        color: "bg-gray-100 text-gray-700 border-gray-200",
        description: "Nur Lesezugriff"
    }
};

export default function RoleManagement() {
    const [currentUser, setCurrentUser] = useState(null);
    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list(),
        initialData: [],
    });

    React.useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const user = await base44.auth.me();
                setCurrentUser(user);
            } catch (error) {
                console.error("Error fetching current user:", error);
            }
        };
        fetchCurrentUser();
    }, []);

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, roleType }) =>
            base44.entities.User.update(userId, { role_type: roleType }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const handleRoleChange = (userId, newRole) => {
        if (confirm(`Möchten Sie die Rolle dieses Benutzers wirklich ändern?`)) {
            updateRoleMutation.mutate({ userId, roleType: newRole });
        }
    };

    const isAdmin = currentUser?.role === "admin" || currentUser?.role_type === "admin";

    if (!isAdmin) {
        return (
            <Alert variant="destructive">
                <AlertDescription>
                    Sie haben keine Berechtigung, auf diese Seite zuzugreifen.
                    Nur Administratoren können Benutzerrollen verwalten.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Rollenverwaltung
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                    Verwalten Sie Benutzerrollen und Berechtigungen
                </p>
            </CardHeader>
            <CardContent className="p-6">
                {/* Role Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {Object.entries(roleConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                            <div key={key} className="border rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{config.label}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600">{config.description}</p>
                            </div>
                        );
                    })}
                </div>

                {/* User List */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Benutzer</h3>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Keine Benutzer gefunden</p>
                    ) : (
                        users.map(user => {
                            const role = user.role_type || "team_member";
                            const config = roleConfig[role] || roleConfig.team_member;
                            const Icon = config.icon;
                            const isCurrentUser = user.email === currentUser?.email;

                            return (
                                <div key={user.id} className="border rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.color}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900 truncate">
                                                    {user.full_name || user.email}
                                                </p>
                                                {isCurrentUser && (
                                                    <Badge variant="outline" className="text-xs">Sie</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                            {user.department && (
                                                <p className="text-xs text-gray-400">{user.department}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Badge className={`${config.color} border`} variant="outline">
                                            {config.label}
                                        </Badge>
                                        <Select
                                            value={role}
                                            onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                                            disabled={isCurrentUser || updateRoleMutation.isPending}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(roleConfig).map(([key, config]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {config.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}