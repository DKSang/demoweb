export interface Specimen {
  id: string;
  name: string;
  category: "Botanical" | "Architectural" | "Pattern";
  complexity: string;
  image: string;
  description: string;
}

export interface Service {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
}
