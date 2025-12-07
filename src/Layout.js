import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Users, Briefcase, Settings, CalendarDays } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { base44 } from "@/api/base44Client";
import RoleSwitcher from "../components/layout/RoleSwitcher";
string testvariable ;
const navigationItems = [
    {
        title: "Dashboard",
        url: createPageUrl("Dashboard"),
        icon: LayoutDashboard,
    },
    {
        title: "Ressourcen",
        url: createPageUrl("Resources"),
        icon: Users,
    },
    {
        title: "Aufgaben",
        url: createPageUrl("Tasks"),
        icon: Briefcase,
    },
    {
        title: "Planung",
        url: createPageUrl("Planning"),
        icon: CalendarDays,
    },
];

export default function Layout({ children, currentPageName }) {
    const location = useLocation();
    const [currentUser, setCurrentUser] = React.useState(null);

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

    const handleRoleChange = () => {
        // This will be called after role change, but we reload the page anyway
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full" style={{ background: "linear-gradient(135deg, #FAFAF9 0%, #F0F0EE 100%)" }}>
                <Sidebar className="border-r border-orange-100">
                    <SidebarHeader className="border-b border-orange-100 p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Settings className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 text-lg">ResourceHub</h2>
                                <p className="text-xs text-gray-500">Ressourcen Manager</p>
                            </div>
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="p-3">
                        <SidebarGroup>
                            <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                                Navigation
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {navigationItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                className={`hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 rounded-xl mb-1 ${location.pathname === item.url ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 shadow-sm' : ''
                                                    }`}
                                            >
                                                <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                                                    <item.icon className="w-5 h-5" />
                                                    <span className="font-medium">{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="border-t border-orange-100 p-4">
                        {currentUser && (
                            <RoleSwitcher
                                currentUser={currentUser}
                                onRoleChange={handleRoleChange}
                            />
                        )}
                    </SidebarFooter>
                </Sidebar>

                <main className="flex-1 flex flex-col">
                    <header className="bg-white/70 backdrop-blur-sm border-b border-orange-100 px-6 py-4 md:hidden sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="hover:bg-orange-50 p-2 rounded-lg transition-colors duration-200" />
                            <h1 className="text-xl font-bold text-gray-900">ResourceHub</h1>
                        </div>
                    </header>

                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}