import { useFileLoaderController } from "@/features/file-loader/model";
import { Textarea } from "@/shared/ui/textarea";

export function StepDescriptionContent() {
  const { description, setDescription } = useFileLoaderController();

  return (
    <Textarea
      value={description}
      onChange={(event) => setDescription(event.target.value)}
      placeholder="Введите описание товара"
      className="min-h-44 resize-none"
    />
  );
}
