import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Palette, Upload } from "lucide-react";

const Customization = () => {
  return (
    <CoachLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Personalização</h1>
          <p className="text-muted-foreground">Customize a área que seus alunos veem</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Cores do App do Aluno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cor Principal</Label>
                <div className="flex gap-2">
                  <Input type="color" defaultValue="#10b981" className="w-14 h-10 p-1 cursor-pointer" />
                  <Input defaultValue="#10b981" className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor de Fundo</Label>
                <div className="flex gap-2">
                  <Input type="color" defaultValue="#0f172a" className="w-14 h-10 p-1 cursor-pointer" />
                  <Input defaultValue="#0f172a" className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor do Texto</Label>
                <div className="flex gap-2">
                  <Input type="color" defaultValue="#f1f5f9" className="w-14 h-10 p-1 cursor-pointer" />
                  <Input defaultValue="#f1f5f9" className="flex-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG até 2MB</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Banner</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                  <p className="text-xs text-muted-foreground">1200x300px recomendado</p>
                </div>
              </div>
              <Button className="w-full">Salvar Personalização</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </CoachLayout>
  );
};

export default Customization;
