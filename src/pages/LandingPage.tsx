import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Dumbbell, TrendingUp, Shield, Smartphone, ChevronRight, UserCheck, GraduationCap } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import { Helmet } from "react-helmet-async";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <AnimatedPage>
    <Helmet>
      <title>Chameleon Coach — Consultoria Online de Treinamento</title>
      <meta name="description" content="Treinos personalizados que evoluem com você. Plataforma de consultoria online que conecta treinadores e alunos com periodização inteligente e acompanhamento em tempo real." />
      <link rel="canonical" href="https://chameleoncoach.com.br/" />
      <meta property="og:title" content="Chameleon Coach — Consultoria Online de Treinamento" />
      <meta property="og:url" content="https://chameleoncoach.com.br/" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Chameleon Coach",
        url: "https://chameleoncoach.com.br/",
        description: "Plataforma de consultoria online de treinamento que conecta treinadores e alunos com periodização inteligente e acompanhamento em tempo real.",
      })}</script>
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Chameleon Coach",
        url: "https://chameleoncoach.com.br/",
        inLanguage: "pt-BR",
      })}</script>
    </Helmet>
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20">
        {/* Background gradient effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-sm text-primary font-medium">
            <Dumbbell className="h-4 w-4" />
            Consultoria Online de Treinamento
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            Treinos que se{" "}
            <span className="text-gradient">adaptam</span>{" "}
            a você
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            O Chameleon Coach conecta treinadores e alunos em uma plataforma inteligente, 
            com treinos personalizados que evoluem junto com você.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/aluno/login")}
              className="w-full sm:w-auto h-14 px-10 text-lg rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
            >
              <GraduationCap className="h-5 w-5 mr-2" />
              Sou Aluno
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/login-treinador")}
              className="w-full sm:w-auto h-14 px-10 text-lg rounded-xl border-2 border-primary/50 text-primary hover:bg-primary/10 transition-all hover:scale-105"
            >
              <UserCheck className="h-5 w-5 mr-2" />
              Sou Treinador
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Por que escolher o{" "}
              <span className="text-gradient">Chameleon Coach</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Uma plataforma completa para transformar seu treinamento
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Dumbbell,
                title: "Treinos Personalizados",
                description: "Cada plano é único e adaptado aos seus objetivos, nível e disponibilidade.",
              },
              {
                icon: Users,
                title: "Acompanhamento Profissional",
                description: "Seu treinador acompanha sua evolução em tempo real com dados detalhados.",
              },
              {
                icon: TrendingUp,
                title: "Evolução Contínua",
                description: "Periodização inteligente que se adapta ao seu progresso a cada semana.",
              },
              {
                icon: Smartphone,
                title: "Facilidade de Acesso",
                description: "Acesse seus treinos de qualquer dispositivo, a qualquer hora e lugar.",
              },
            ].map((benefit, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Como <span className="text-gradient">funciona</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Comece sua transformação em poucos passos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Cadastro", description: "Crie sua conta e conecte-se ao seu treinador" },
              { step: "02", title: "Avaliação", description: "Seu treinador avalia seu nível e objetivos" },
              { step: "03", title: "Plano", description: "Receba um plano de treino 100% personalizado" },
              { step: "04", title: "Evolução", description: "Acompanhe seu progresso e evolua continuamente" },
            ].map((item, i) => (
              <div key={i} className="relative text-center group">
                <div className="text-5xl font-bold text-primary/15 group-hover:text-primary/25 transition-colors mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
                {i < 3 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-4 h-6 w-6 text-primary/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center p-10 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <Shield className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Pronto para evoluir?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Junte-se ao Chameleon Coach e leve seu treinamento para o próximo nível.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/aluno/login")}
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105"
            >
              Sou Aluno
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/login-treinador")}
              className="h-12 px-8 rounded-xl border-primary/50 text-primary hover:bg-primary/10 transition-all hover:scale-105"
            >
              Sou Treinador
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Dumbbell className="h-5 w-5 text-primary" />
            Chameleon Coach
          </div>
          <p>© {new Date().getFullYear()} Chameleon Coach. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
    </AnimatedPage>
  );
};

export default LandingPage;
