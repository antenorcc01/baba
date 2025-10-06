"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import SuspensionManager from "./SuspensionManager";
import { Separator } from "@/components/ui/separator";

interface Rule {
  id: number;
  title: string;
  description: string;
  order: number;
}

const RegulamentoTab = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRule, setNewRule] = useState({ title: "", description: "" });
  const { isAdmin } = useAuth();
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('group_rules')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      showError(error.message || "Erro ao carregar regras");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.title || !newRule.description) {
      showError("Título e descrição são obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('group_rules')
        .insert({
          title: newRule.title,
          description: newRule.description,
          order: rules.length + 1
        });

      if (error) throw error;
      
      showSuccess("Regra adicionada com sucesso!");
      setNewRule({ title: "", description: "" });
      fetchRules();
    } catch (error: any) {
      showError(error.message || "Erro ao adicionar regra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingRule = (rule: Rule) => {
    setEditingRuleId(rule.id);
  };

  const saveRuleEdit = async (id: number, updates: Partial<Rule>) => {
    try {
      const { error } = await supabase
        .from('group_rules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      showSuccess("Regra atualizada com sucesso!");
      setEditingRuleId(null);
      fetchRules();
    } catch (error: any) {
      showError(error.message || "Erro ao atualizar regra");
    }
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) return;

    try {
      const { error } = await supabase
        .from('group_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      showSuccess("Regra excluída com sucesso!");
      fetchRules();
    } catch (error: any) {
      showError(error.message || "Erro ao excluir regra");
    }
  };

  const moveRule = async (id: number, direction: 'up' | 'down') => {
    const currentIndex = rules.findIndex(r => r.id === id);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < rules.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    const newRules = [...rules];
    const [movedRule] = newRules.splice(currentIndex, 1);
    newRules.splice(newIndex, 0, movedRule);

    try {
      const updates = newRules.map((rule, index) => 
        supabase.from('group_rules').update({ order: index + 1 }).eq('id', rule.id)
      );
      
      await Promise.all(updates);
      fetchRules();
    } catch (error: any) {
      showError(error.message || "Erro ao reordenar regras");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <SuspensionManager />

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Regras</CardTitle>
          <CardDescription>
            Adicione, edite ou remova regras do grupo. As regras aparecerão na página "Regulamento" para todos os usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-title">Título da Regra</Label>
                <Input
                  id="rule-title"
                  value={newRule.title}
                  onChange={(e) => setNewRule({...newRule, title: e.target.value})}
                  placeholder="Ex: Regras de Pagamento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-description">Descrição</Label>
                <Textarea
                  id="rule-description"
                  value={newRule.description}
                  onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                  placeholder="Descreva a regra em detalhes..."
                  rows={3}
                />
              </div>
            </div>
            <Button 
              onClick={handleAddRule} 
              disabled={isSubmitting || !newRule.title || !newRule.description}
            >
              {isSubmitting ? "Adicionando..." : "Adicionar Regra"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhuma regra cadastrada ainda.</p>
          ) : (
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <div key={rule.id} className="border rounded-lg p-4">
                  {editingRuleId === rule.id ? (
                    <div className="space-y-3">
                      <Input
                        value={rule.title}
                        onChange={(e) => setRules(rules.map(r => r.id === rule.id ? {...r, title: e.target.value} : r))}
                        className="font-bold text-lg"
                      />
                      <Textarea
                        value={rule.description}
                        onChange={(e) => setRules(rules.map(r => r.id === rule.id ? {...r, description: e.target.value} : r))}
                        className="min-h-[120px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={cancelEditing}>Cancelar</Button>
                        <Button onClick={() => saveRuleEdit(rule.id, { title: rule.title, description: rule.description })}>Salvar</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-2">
                        <h3 className="font-bold text-lg flex-shrink-0">{rule.title}</h3>
                        <div className="flex gap-2 flex-wrap justify-start sm:justify-end w-full">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => moveRule(rule.id, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => moveRule(rule.id, 'down')}
                            disabled={index === rules.length - 1}
                          >
                            ↓
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => startEditingRule(rule)}
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-line">{rule.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegulamentoTab;