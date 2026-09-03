import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/routes';
import { DemoProvider } from './demo/DemoProvider';
import { useDemo } from './demo/context';
import { ACTIONS } from './demo/reducer';
import { createSeedState } from './demo/seed';
import {
  completeOnboarding,
  hasEnteredDemo,
  hasFinishedOnboarding,
  launchDemo,
  loadPreferences,
  replayOnboarding,
  resetDemoPersistence,
  savePreference,
} from './demo/persistence';
import LandingPage from './features/landing/LandingPage';
import OnboardingDialog from './features/onboarding/OnboardingDialog';

function Experience() {
  const { dispatch } = useDemo();
  const [entered, setEntered] = useState(() => hasEnteredDemo());
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  function enterDemo() {
    launchDemo();
    setEntered(true);
    setOnboardingOpen(!hasFinishedOnboarding());
  }

  function choosePersona(personaId) {
    savePreference('persona', personaId);
    dispatch({ type: ACTIONS.SET_PERSONA, personaId });
  }

  function finishOnboarding() {
    completeOnboarding();
    setOnboardingOpen(false);
  }

  function replay() {
    replayOnboarding();
    setOnboardingOpen(true);
  }

  function reset() {
    resetDemoPersistence();
    dispatch({ type: ACTIONS.RESET_DEMO });
    setEntered(false);
    setOnboardingOpen(false);
  }

  if (!entered) return <LandingPage onLaunch={enterDemo} />;

  return (
    <>
      <AppRoutes onReplayOnboarding={replay} onReset={reset} />
      <OnboardingDialog
        open={onboardingOpen}
        onComplete={finishOnboarding}
        onSkip={finishOnboarding}
        onPersonaChange={choosePersona}
      />
    </>
  );
}

export default function App() {
  const [initialState] = useState(() => {
    const preferences = loadPreferences();
    return { ...createSeedState(), activePersonaId: preferences.persona, theme: preferences.theme, density: preferences.density };
  });
  return (
    <DemoProvider initialState={initialState}>
      <BrowserRouter>
        <Experience />
      </BrowserRouter>
    </DemoProvider>
  );
}
