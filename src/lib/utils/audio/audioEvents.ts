/**
 * Audio-related event names for coordination between components
 */

// Event dispatched when a MIDI dialog opens to pause all audio playback
export const MIDI_DIALOG_OPENED_EVENT = 'midi-dialog-opened'

// Custom event interface for MIDI dialog events
export interface MidiDialogEventDetail {
	stemName: string
	sourceId?: string
}

/**
 * Creates a custom event for MIDI dialog opened
 * @param detail Information about which stem opened the MIDI dialog
 * @returns CustomEvent object
 */
export function createMidiDialogOpenedEvent(detail: MidiDialogEventDetail): CustomEvent<MidiDialogEventDetail> {
	return new CustomEvent<MidiDialogEventDetail>(MIDI_DIALOG_OPENED_EVENT, {
		detail,
		bubbles: true,
		cancelable: true,
	})
}
