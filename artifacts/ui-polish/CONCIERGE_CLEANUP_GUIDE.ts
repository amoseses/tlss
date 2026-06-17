/**
 * Concierge Flow Audit & Cleanup Guide
 * Consolidate overlapping flows and fix UX issues
 */

export const conciergeFlowAudit = {
  currentFlows: [
    {
      name: 'Find a Gift',
      status: 'Active',
      issues: [
        'Unclear entry point',
        'Users dont know to click "Try AI" first',
        'No context preservation between messages',
      ],
      fix: 'Make "Try Givit AI" prominent, with typing indicator and welcome message',
    },
    {
      name: 'Create Gift Board',
      status: 'Active',
      issues: [
        'Buried in navigation',
        'No empty state guidance',
        'Image upload UX unclear',
      ],
      fix: 'Add CTA modal on home, clear image upload flow, Pinterest-like grid layout',
    },
    {
      name: 'AutoGift Setup',
      status: 'Active',
      issues: [
        'Named "Conquer", confusing',
        'No explainer modal',
        'Approval flow unclear',
      ],
      fix: 'Rename to "AutoGift", add 4-step explainer modal, clarify approval workflow',
    },
    {
      name: 'Concierge Widget',
      status: 'Active',
      issues: [
        'Too many redundant buttons',
        'Chat can get lost',
        'No clear next steps after chat',
      ],
      fix: 'Consolidate to 3 main flows (Find Gift, AutoGift, Create Board), add action buttons in chat',
    },
  ],

  consolidatedFlows: [
    {
      name: 'Find a Gift',
      entry: 'Click "Try Givit AI" button',
      steps: [
        'Welcome message: "Who are you shopping for?"',
        'Gather context: recipient, occasion, budget, interests',
        'Show 3-5 suggestions with "Why this gift" blurbs',
        'Allow "Not what I wanted", "Regenerate", or "Save to Board"',
      ],
      exitPoints: [
        'User finds gift and adds to cart',
        'User creates a board to save ideas',
        'User starts AutoGift setup',
      ],
    },
    {
      name: 'Create Gift Board',
      entry: 'Click "Gift Boards" in nav or "Create Board" in concierge',
      steps: [
        'Modal: "Give your board a name and description"',
        'Grid layout: drag gifts or search to add items',
        'Image upload for board cover',
        'Privacy toggle: public/private',
        'Share or save',
      ],
      exitPoints: ['Board created', 'Invited friends to view'],
    },
    {
      name: 'Set Up AutoGift',
      entry: 'Click "AutoGift" in nav or "Set Up AutoGift" in concierge',
      steps: [
        '4-step explainer modal',
        'Add recipients: name, birthday, interests',
        'Set occasions: birthdays, anniversaries, holidays',
        'Confirm: show reminder schedule',
        'Approve first suggestion',
      ],
      exitPoints: ['AutoGift active', 'Reminders enabled'],
    },
  ],

  uxImprovements: [
    {
      issue: 'Users dont see the "Try AI" button',
      solution: 'Make it high-contrast, place it above the fold, add animation on page load',
    },
    {
      issue: 'Chat gets cluttered with repeated messages',
      solution: 'Add "Start Over" button, collapse old messages, show typing indicator',
    },
    {
      issue: 'Unclear how to save/share results',
      solution: 'Add "Save to Board" and "Share" buttons after each suggestion',
    },
    {
      issue: 'AutoGift approval workflow unclear',
      solution: 'Show confirmation modal with: recipient + occasion + suggested gift + approval CTA',
    },
    {
      issue: 'Image upload for boards is confusing',
      solution: 'Add drag-drop area, show preview, allow re-order via drag',
    },
  ],
};
