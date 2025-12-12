import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

// Componentes dos passos
import QuickClientForm from "@/components/serviceOrders/QuickClientForm";
import { QuickAircraftForm } from "@/components/aircraft/QuickAircraftForm";

/**
 * Interface para dados do cliente criado
 */
interface CreatedClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

/**
 * Interface para dados da aeronave criada
 */
interface CreatedAircraft {
  id: string;
  matricula: string;
  client_id: string;
}

/**
 * Página de cadastro rápido de ordem de serviço em 3 passos:
 * 1. Cadastro do cliente
 * 2. Cadastro da aeronave
 * 3. Redirecionamento para criação da OS/Orçamento
 */
export default function QuickCreateServiceOrder() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [createdClient, setCreatedClient] = useState<CreatedClient | null>(null);
  const [createdAircraft, setCreatedAircraft] = useState<CreatedAircraft | null>(null);

  /**
   * Navega para o próximo passo
   */
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * Navega para o passo anterior
   */
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Callback quando cliente é criado com sucesso
   */
  const handleClientCreated = (client: CreatedClient) => {
    setCreatedClient(client);
    // console.log('setCreatedClient', client);
    
    toast.success("Cliente cadastrado com sucesso!");
    handleNextStep();
  };

  /**
   * Callback quando aeronave é criada com sucesso
   */
  const handleAircraftCreated = (aircraft: CreatedAircraft) => {
    setCreatedAircraft(aircraft);
    toast.success("Aeronave cadastrada com sucesso!");
    handleNextStep();
  };

  /**
   * Finaliza o processo e redireciona para criação da OS
   */
  const handleFinish = () => {
    if (createdClient && createdAircraft) {
      // Redireciona para a página de criação com dados preenchidos
      navigate("/admin/service-orders/create", {
        state: {
          quickCreate: true,
          clientId: createdClient.id,
          aircraftId: createdAircraft.id
        }
      });
    }
  };

  /**
   * Volta para a página de ordens de serviço
   */
  const handleCancel = () => {
    navigate("/admin/service-orders");
  };

  /**
   * Renderiza o indicador de progresso
   */
  const renderProgressIndicator = () => {
    const steps = [
      { number: 1, title: "Cliente", completed: currentStep > 1 },
      { number: 2, title: "Aeronave", completed: currentStep > 2 },
      { number: 3, title: "Finalizar", completed: false }
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.completed
                    ? "bg-green-500 text-white"
                    : currentStep === step.number
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <span className="text-xs mt-1 text-gray-600">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-4 ${
                  step.completed ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Renderiza o conteúdo do passo atual
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <QuickClientForm
            onClientCreated={handleClientCreated}
            onCancel={handleCancel}
          />
        );
      case 2:
        return (
          <QuickAircraftForm
            clientId={createdClient?.id || ""}
            clientName={createdClient?.name || ""}
            onAircraftCreated={handleAircraftCreated}
            onCancel={handlePreviousStep}
          />
        );
      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-600">
                Cadastro Concluído com Sucesso!
              </h3>
              <p className="text-gray-600">
                Cliente e aeronave foram cadastrados. Agora você será redirecionado
                para criar a ordem de serviço ou orçamento.
              </p>
            </div>

            {/* Resumo dos dados criados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Cliente Criado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-medium">{createdClient?.name}</p>
                    {createdClient?.email && (
                      <p className="text-sm text-gray-600">{createdClient.email}</p>
                    )}
                    {createdClient?.phone && (
                      <p className="text-sm text-gray-600">{createdClient.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Aeronave Criada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-medium">{createdAircraft?.matricula}</p>
                    <Badge variant="outline" className="text-xs">
                      Vinculada ao cliente
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handlePreviousStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                Criar Ordem de Serviço
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cadastro Rápido</h1>
            <p className="text-gray-600">
              Crie cliente, aeronave e ordem de serviço em poucos passos
            </p>
          </div>
        </div>
      </div>

      {/* Indicador de progresso */}
      {renderProgressIndicator()}

      {/* Conteúdo do passo atual */}
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}