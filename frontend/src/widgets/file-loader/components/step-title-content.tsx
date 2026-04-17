import { useFileLoaderController } from "@/features/file-loader/model";
import { Input } from "@/shared/ui/input";

export function StepTitleContent() {
  const { title, setTitle } = useFileLoaderController();

  return (
    <Input
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      placeholder="Введите название товара"
      className="h-11"
    />
  );
}
