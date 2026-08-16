import type { Role } from '../../../types';

const ROLE_COPY: Partial<Record<Role, string>> = {
  farmer: "Tell us what you farm so we can prioritize the inputs, equipment, services, and buyers most relevant to you.",
  'agro-dealer': "Tell us what you sell so we can prioritize the buyers and demand most relevant to your business.",
  'service-provider': "Tell us what services you offer so we can prioritize the farms and opportunities most relevant to you.",
  buyer: "Tell us what you usually buy so we can prioritize the freshest, most relevant listings for you.",
};

interface RoleIntroStepProps {
  role: Role;
  onNext: () => void;
  onSkip: () => void;
}

export function RoleIntroStep({ role, onNext, onSkip }: RoleIntroStepProps) {
  return (
    <div className="onboard-intro">
      <div className="onboard-intro-badge">
        <i className="fa-solid fa-wand-magic-sparkles"></i>
      </div>
      <h2>Let's personalize your Agrobaba experience</h2>
      <p className="onboard-intro-lead">
        {ROLE_COPY[role] || "Tell us a bit about what you're here for so we can prioritize what's relevant to you."}
      </p>
      <p className="onboard-intro-note">
        This takes under a minute, and never restricts what you can browse — you can always search the full
        marketplace, and change these answers anytime from your profile.
      </p>
      <div className="onboard-intro-actions">
        <button type="button" className="btn-primary" onClick={onNext}>
          <i className="fa-solid fa-arrow-right"></i> Get Started
        </button>
        <button type="button" className="btn-outline" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
