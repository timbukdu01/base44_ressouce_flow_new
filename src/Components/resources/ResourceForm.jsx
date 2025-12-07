import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

export default function ResourceForm({ resource, onSubmit, onCancel, isLoading }) {
    const [formData, setFormData] = useState(resource || {
        name: "",
        type: "employee",
        status: "available",
        description: "",
        location: "",
        capacity: "",
        contact_info: "",
        skills: []
    });

    const [skillInput, setSkillInput] = useState("");

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addSkill = () => {
        if (skillInput.trim() && !(formData.skills || []).includes(skillInput.trim())) {
            handleChange("skills", [...(formData.skills || []), skillInput.trim()]);
            setSkillInput("");
        }
    };

    const removeSkill = (skillToRemove) => {
        handleChange("skills", (formData.skills || []).filter(s => s !== skillToRemove));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = { ...formData };
        if (submitData.capacity) {
            submitData.capacity = parseFloat(submitData.capacity);
        }
        // Ensure skills is always an array
        if (!submitData.skills) {
            submitData.skills = [];
        }
        onSubmit(submitData);
    };

    return (
        <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold">
                    {resource ? "Ressource bearbeiten" : "Neue Ressource"}
                </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="z.B. Max Mustermann"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Typ *</Label>
                            <Select value={formData.type} onValueChange={(val) => handleChange("type", val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="employee">Mitarbeiter</SelectItem>
                                    <SelectItem value="room">Raum</SelectItem>
                                    <SelectItem value="equipment">Gerät</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={formData.status} onValueChange={(val) => handleChange("status", val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="available">Verfügbar</SelectItem>
                                    <SelectItem value="in_use">In Nutzung</SelectItem>
                                    <SelectItem value="maintenance">Wartung</SelectItem>
                                    <SelectItem value="unavailable">Nicht verfügbar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Standort</Label>
                            <Input
                                id="location"
                                value={formData.location || ""}
                                onChange={(e) => handleChange("location", e.target.value)}
                                placeholder="z.B. Gebäude A, Raum 203"
                            />
                        </div>

                        {formData.type === "room" && (
                            <div className="space-y-2">
                                <Label htmlFor="capacity">Kapazität</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    value={formData.capacity || ""}
                                    onChange={(e) => handleChange("capacity", e.target.value)}
                                    placeholder="Anzahl Personen"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="contact">Kontaktinformationen</Label>
                            <Input
                                id="contact"
                                value={formData.contact_info || ""}
                                onChange={(e) => handleChange("contact_info", e.target.value)}
                                placeholder="z.B. +49 123 456789"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Beschreibung</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ""}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder="Zusätzliche Informationen..."
                            rows={3}
                        />
                    </div>

                    {formData.type === "employee" && (
                        <div className="space-y-2">
                            <Label>Fähigkeiten / Qualifikationen</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    placeholder="z.B. JavaScript, Projektmanagement"
                                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                                />
                                <Button type="button" variant="outline" onClick={addSkill}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            {(formData.skills || []).length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {(formData.skills || []).map((skill, i) => (
                                        <Badge key={i} variant="secondary" className="gap-1">
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => removeSkill(skill)}
                                                className="hover:text-red-600"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>

                <CardFooter className="border-t flex justify-end gap-3 p-6">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                        Abbrechen
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
                        {isLoading ? "Wird gespeichert..." : resource ? "Speichern" : "Erstellen"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}