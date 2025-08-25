import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Mail, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PermissionsManagerCard } from "@/components/admin/PermissionsManagerCard";
import type { User as UserType } from "@shared/schema";

export default function UserSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const { user: currentUser, isLoading } = useAuth();

  const updateUserMutation = useMutation({
    mutationFn: async (userData: { name: string; email: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${currentUser?.id}`, userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditing(false);
      toast({
        title: "Sucesso",
        description: "Informações atualizadas com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar informações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Initialize form data when user data loads
  React.useEffect(() => {
    if (currentUser && !isEditing) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
      });
    }
  }, [currentUser, isEditing]);

  const handleEditToggle = () => {
    if (!isEditing && currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O email é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    updateUserMutation.mutate(formData);
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "developer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "busy":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mx-auto mb-4" />
          <p className="text-xs text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Erro ao carregar configurações do usuário.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="flex items-center space-x-2"
                data-testid="button-back-to-kanban"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Kanban</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Perfil
              </CardTitle>
              <CardDescription>
                Gerencie suas informações básicas de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage 
                      src={currentUser.avatar || undefined} 
                      alt={currentUser.name}
                    />
                    <AvatarFallback className="bg-indigo-500 text-white text-lg font-medium">
                      {currentUser.avatar || (currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${getStatusColor(currentUser.status || 'offline')}`}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{currentUser.name}</h3>
                  <p className="text-sm text-gray-500">{currentUser.email}</p>
                  <Badge className={`mt-1 ${getRoleColor(currentUser.role || 'user')}`}>
                    {currentUser.role || 'Usuário'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={isEditing ? formData.name : currentUser.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    data-testid="input-user-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={isEditing ? formData.email : currentUser.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                    data-testid="input-user-email"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleEditToggle}
                      disabled={updateUserMutation.isPending}
                      data-testid="button-cancel-edit"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={updateUserMutation.isPending}
                      data-testid="button-save-changes"
                    >
                      {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleEditToggle}
                    data-testid="button-edit-profile"
                  >
                    Editar Informações
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Detalhes da Conta
              </CardTitle>
              <CardDescription>
                Informações sobre sua conta no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">ID da Conta</Label>
                    <p className="text-sm text-gray-900 font-mono">{currentUser.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Cargo/Função</Label>
                    <p className="text-sm text-gray-900">{currentUser.role || 'Usuário'}</p>
                  </div>
                </div>
                
                {currentUser.createdAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Conta criada em
                    </Label>
                    <p className="text-sm text-gray-900">
                      {new Date(currentUser.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permissions Manager Card */}
          <PermissionsManagerCard />
        </div>
      </div>
    </div>
  );
}