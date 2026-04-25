import { SetSubBarTitle } from "@/components/rmx-shell/sub-bar-context";
import { SetupForm } from "@/components/setup-form/setup-form";
import { Toaster } from "@/components/ui/sonner";

export default function SetupPage() {
  return (
    <>
      <SetSubBarTitle title="Add Website Template" />
      <SetupForm />
      <Toaster richColors position="top-right" />
    </>
  );
}
