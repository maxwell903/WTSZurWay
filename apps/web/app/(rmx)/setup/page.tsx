import { SetSubBarTitle } from "@/components/rmx-shell/sub-bar-context";
import { SetupExperience } from "@/components/setup-form/SetupExperience";
import { Toaster } from "@/components/ui/sonner";

export default function SetupPage() {
  return (
    <>
      <SetSubBarTitle title="Add Website Template" />
      <SetupExperience />
      <Toaster richColors position="top-right" />
    </>
  );
}
