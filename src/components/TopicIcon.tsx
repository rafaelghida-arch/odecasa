import type { ExampleTopic } from "@/lib/examples";
import { IconPan, IconShirt, IconSparkle, IconWrench } from "./icons";

export function TopicIcon({ topic, size = 20 }: { topic: ExampleTopic; size?: number }) {
  switch (topic) {
    case "cozinha":
      return <IconPan size={size} />;
    case "limpeza":
      return <IconSparkle size={size} />;
    case "roupas":
      return <IconShirt size={size} />;
    case "montagem":
      return <IconWrench size={size} />;
  }
}
