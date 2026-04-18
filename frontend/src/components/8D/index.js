/**
 * 8D Components Index
 * Central export for all 8D module components
 */

// Core Tab Components
export { default as TeamAssignmentTab } from './TeamAssignmentTab';
export { default as D3MFG } from './D3MFG';
export { default as D4ContainmentRootCause } from './D4ContainmentRootCause';
export { default as D5CorrectiveActions } from './D5CorrectiveActions';
export { default as D5D6D7Countermeasures } from './D5D6D7Countermeasures';
export { default as D7Validation } from './D7Validation';
export { default as D8FollowUpEvidence } from './D8FollowUpEvidence';
export { default as HistoryTab } from './HistoryTab';

// Approval Components
export { default as ApprovalPanel } from './ApprovalPanel';
export { default as ApprovalModal } from './ApprovalModal';
export { default as ApprovalTimeline } from './ApprovalTimeline';
export { default as StatusBadge } from './StatusBadge';

// UX Enhancement Components (MEJORAS)
export { default as CollapsibleSection } from './CollapsibleSection';
export { default as ApprovalStepper } from './ApprovalStepper';
export { default as ConfirmationModal } from './ConfirmationModal';
export { default as DisabledFieldWrapper, getDisabledReason } from './DisabledFieldWrapper';
export { default as SectionProgressIndicator, MiniProgressBar } from './SectionProgressIndicator';

// Visualization Components
export { default as GanttChart } from './GanttChart';
export { default as ProcessFlowBuilder } from './ProcessFlowBuilder';
export { default as PartsInventoryTable } from './PartsInventoryTable';

// Form Components
export * from './Form';
