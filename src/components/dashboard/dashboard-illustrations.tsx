import { ArrowUpRight, BarChart3, Mail, Sparkles, Workflow } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="hero-illustration" aria-hidden="true">
      <div className="hero-glow" />
      <div className="hero-window">
        <div className="hero-window-bar">
          <span />
          <span />
          <span />
          <div className="hero-window-search" />
        </div>
        <div className="hero-window-body">
          <div className="hero-window-sidebar">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="hero-window-content">
            <div className="hero-window-heading">
              <span />
              <span />
            </div>
            <div className="hero-window-kpis">
              <span />
              <span />
              <span />
            </div>
            <div className="hero-chart">
              <div className="hero-chart-line" />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
      <div className="hero-float hero-float-mail">
        <Mail size={16} />
      </div>
      <div className="hero-float hero-float-chart">
        <BarChart3 size={16} />
      </div>
      <div className="hero-float hero-float-flow">
        <Workflow size={15} />
        <ArrowUpRight size={12} />
      </div>
    </div>
  );
}

export function RevenueIllustration() {
  return (
    <div className="revenue-illustration" aria-hidden="true">
      <div className="revenue-coin">$</div>
      <div className="revenue-bars">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="revenue-spark" />
    </div>
  );
}

export function AiIllustration() {
  return (
    <div className="ai-illustration" aria-hidden="true">
      <div className="ai-orbit ai-orbit-one" />
      <div className="ai-orbit ai-orbit-two" />
      <div className="ai-core">
        <Sparkles size={22} />
      </div>
      <span className="ai-dot ai-dot-one" />
      <span className="ai-dot ai-dot-two" />
      <span className="ai-dot ai-dot-three" />
    </div>
  );
}
