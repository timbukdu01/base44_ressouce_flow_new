
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResourceCard from "../components/resources/ResourceCard";
import ResourceForm from "../components/resources/ResourceForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Resources() {
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list("-created_date"),
    initialData: [],
  });

  useEffect(() => {
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Resource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowForm(false);
      setEditingResource(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowForm(false);
      setEditingResource(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Resource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  // Role-based permissions
  const userRole = currentUser?.role_type || currentUser?.role || "viewer";
  const isProjectManager = userRole === "project_manager";
  const isTeamMember = userRole === "team_member";
  const isAdmin = userRole === "admin";
  const isViewer = userRole === "viewer";

  // Only project managers can create/edit/delete resources
  const canManage = isProjectManager;
  const canView = true; // Everyone can view

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const addType = urlParams.get('add');
    if (addType && ['employee', 'room', 'equipment'].includes(addType)) {
      // Only project managers can add resources
      if (canManage) {
        setEditingResource({ type: addType });
        setShowForm(true);
      }
    }
  }, [currentUser, canManage]); // Added canManage to dependency array

  const handleSubmit = (data) => {
    if (editingResource?.id) {
      updateMutation.mutate({ id: editingResource.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm("Möchten Sie diese Ressource wirklich löschen?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || resource.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Ressourcen</h1>
            <p className="text-gray-600">
              {canManage ? "Verwalten Sie Ihre Mitarbeiter, Räume und Geräte" : "Übersicht der verfügbaren Ressourcen"}
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setEditingResource(null);
                setShowForm(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Neue Ressource
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Ressourcen durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white shadow-sm"
            />
          </div>
          
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList className="bg-white shadow-sm">
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="employee">Mitarbeiter</TabsTrigger>
              <TabsTrigger value="room">Räume</TabsTrigger>
              <TabsTrigger value="equipment">Geräte</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || typeFilter !== "all" ? "Keine Ressourcen gefunden" : "Keine Ressourcen vorhanden"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || typeFilter !== "all" 
                ? "Versuchen Sie einen anderen Suchbegriff oder Filter" 
                : canManage ? "Erstellen Sie Ihre erste Ressource" : "Derzeit sind keine Ressourcen verfügbar"}
            </p>
            {canManage && (
              <Button onClick={() => setShowForm(true)} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-5 h-5 mr-2" />
                Ressource hinzufügen
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredResources.map((resource, index) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onEdit={canManage ? handleEdit : null}
                  onDelete={canManage ? handleDelete : null}
                  index={index}
                  readOnly={!canManage}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {canManage && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <ResourceForm
                resource={editingResource}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingResource(null);
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
