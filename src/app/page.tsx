import { Navbar } from "@/components/Navbar";
import { LaunchpadForm } from "@/components/LaunchpadForm";

export default function HomePage() {
  return (
    <div className="page-shell">
      <Navbar />
      <LaunchpadForm />
      <footer className="footer">
        SolFoundry // SPL Token-2022 Protocol Infrastructure
      </footer>
    </div>
  );
}