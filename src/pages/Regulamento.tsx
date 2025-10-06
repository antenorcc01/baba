"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DollarSignIcon, ShieldCheckIcon, SwordsIcon, UsersIcon, ClockIcon } from "lucide-react";

interface Rule {
  id: number;
  title: string;
  description: string;
  order: number;
}

const getIconForRule = (index: number) => {
  const icons = [DollarSignIcon, ShieldCheckIcon, UsersIcon, SwordsIcon, ClockIcon];
  return icons[index % icons.length];
};

const getColorForRule = (index: number) => {
  const colors = ["text-green-500", "text-blue-500", "text-yellow-500", "text-red-500", "text-purple-500"];
  return colors[index % colors.length];
};

export default function RegulamentoPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('group_rules')
          .select('*')
          .order('order', { ascending: true });

        if (error) throw error;
        setRules(data || []);
      } catch (error) {
        console.error("Error fetching rules:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">Regulamento</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Regulamento Oficial do Baba dos Baianos</h2>
          <p className="text-muted-foreground">As regras de ouro para garantir a resenha e o bom futebol!</p>
        </div>

        <div className="space-y-6">
          {rules.length > 0 ? (
            rules.map((rule, index) => {
              const IconComponent = getIconForRule(index);
              const colorClass = getColorForRule(index);
              
              return (
                <Card key={rule.id} className="border-primary">
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-3 ${colorClass}`}>
                      <IconComponent className="h-6 w-6" />
                      {rule.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line">{rule.description}</p>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">Nenhum regulamento cadastrado ainda.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}