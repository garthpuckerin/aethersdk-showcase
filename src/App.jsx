import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/routes';
import { DemoProvider } from './demo/DemoProvider';
import { useDemo } from './demo/context';
import { buildInitialState } from './demo/bootstrap';
import { ACTIONS } from './demo/reducer';
import {
  clearWorkflowState,
  completeOnboarding,
  hasEnteredDemo,
  hasFinishedOnboarding,
  launchDemo,
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
    clearWorkflowState();
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
  const [initialState] = useState(buildInitialState);
  return (
    <DemoProvider initialState={initialState}>
      <BrowserRouter>
        <Experience />
      </BrowserRouter>
    </DemoProvider>
  );
}
