'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/ui/utils'

type AccordionSingleProps = {
	type: 'single'
	collapsible?: boolean
	value?: string
	defaultValue?: string
	onValueChange?: (value: string) => void
	className?: string
	children?: React.ReactNode
}

type AccordionMultipleProps = {
	type: 'multiple'
	value?: string[]
	defaultValue?: string[]
	onValueChange?: (value: string[]) => void
	className?: string
	children?: React.ReactNode
}

type AccordionProps = AccordionSingleProps | AccordionMultipleProps

type AccordionContextValue = {
	value: string | string[] | undefined
	onValueChange: ((value: string) => void) | ((value: string[]) => void) | undefined
	type: 'single' | 'multiple'
	collapsible?: boolean
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined)

function Accordion(props: AccordionProps) {
	const { className, children, ...restProps } = props

	// Manage open state internally if no controlled value
	const [value, setValue] = React.useState<string | string[] | undefined>(
		props.defaultValue || (props.type === 'multiple' ? [] : undefined)
	)

	// Use controlled value if provided
	const currentValue = props.value !== undefined ? props.value : value

	// Handle value change
	const handleValueChange = (newValue: string | string[]) => {
		if (props.value === undefined) {
			setValue(newValue)
		}

		// Call parent handler if provided
		props.onValueChange?.(newValue as any)
	}

	return (
		<AccordionContext.Provider
			value={{
				value: currentValue,
				onValueChange: handleValueChange,
				type: props.type,
				collapsible: props.type === 'single' ? props.collapsible : true,
			}}
		>
			<div data-slot="accordion" className={className}>
				{children}
			</div>
		</AccordionContext.Provider>
	)
}

type AccordionItemProps = {
	value: string
	className?: string
	children?: React.ReactNode
	disabled?: boolean
}

function AccordionItem({ value: itemValue, className, children, disabled = false, ...otherProps }: AccordionItemProps) {
	const context = React.useContext(AccordionContext)

	if (!context) {
		throw new Error('AccordionItem must be used within an Accordion')
	}

	const isOpen = context.type === 'multiple' ? ((context.value as string[]) || []).includes(itemValue) : context.value === itemValue

	const toggleItem = () => {
		if (disabled) return

		if (context.type === 'multiple') {
			const currentValue = (context.value as string[]) || []
			const newValue = isOpen ? currentValue.filter((v) => v !== itemValue) : [...currentValue, itemValue]

			;(context.onValueChange as (value: string[]) => void)?.(newValue)
		} else {
			// Single type
			if (isOpen && !context.collapsible) {
				// If already open and not collapsible, do nothing
				return
			}

			const newValue = isOpen ? undefined : itemValue
			;(context.onValueChange as (value: string) => void)?.(newValue as string)
		}
	}

	// Create a context to pass data to children
	const itemContext = {
		isOpen,
		toggleItem,
		disabled,
	}

	return (
		<div
			data-state={isOpen ? 'open' : 'closed'}
			data-disabled={disabled || undefined}
			data-slot="accordion-item"
			className={cn('border-b last:border-b-0', className)}
			{...otherProps}
		>
			{/* Use a nested provider to avoid DOM prop issues */}
			<AccordionItemProvider value={itemContext}>{children}</AccordionItemProvider>
		</div>
	)
}

// New context for the accordion item
type AccordionItemContextType = {
	isOpen: boolean
	toggleItem: () => void
	disabled: boolean
}

const AccordionItemContext = React.createContext<AccordionItemContextType | undefined>(undefined)

function AccordionItemProvider({ children, value }: { children: React.ReactNode; value: AccordionItemContextType }) {
	return <AccordionItemContext.Provider value={value}>{children}</AccordionItemContext.Provider>
}

// Custom hook to access the accordion item context
function useAccordionItem() {
	const context = React.useContext(AccordionItemContext)
	if (!context) {
		throw new Error('useAccordionItem must be used within an AccordionItem')
	}
	return context
}

type AccordionTriggerProps = {
	className?: string
	children?: React.ReactNode
}

function AccordionTrigger({ className, children }: AccordionTriggerProps) {
	// Use the context hook to get data
	const { isOpen, toggleItem, disabled } = useAccordionItem()

	return (
		<div className="flex">
			<button
				type="button"
				onClick={toggleItem}
				disabled={disabled}
				data-state={isOpen ? 'open' : 'closed'}
				data-disabled={disabled || undefined}
				data-slot="accordion-trigger"
				className={cn(
					'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
					className
				)}
			>
				{children}
				<ChevronDown
					className={cn(
						'text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200',
						isOpen && 'rotate-180'
					)}
				/>
			</button>
		</div>
	)
}

type AccordionContentProps = {
	className?: string
	children?: React.ReactNode
}

function AccordionContent({ className, children }: AccordionContentProps) {
	// Use the context hook to get data
	const { isOpen } = useAccordionItem()
	const contentRef = React.useRef<HTMLDivElement>(null)

	return (
		<div
			ref={contentRef}
			data-state={isOpen ? 'open' : 'closed'}
			data-slot="accordion-content"
			className={cn(
				'overflow-hidden transition-all duration-300',
				isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
				'text-sm'
			)}
			style={{ transitionTimingFunction: 'cubic-bezier(0.87, 0, 0.13, 1)' }}
		>
			<div className={cn('pt-0 pb-4', className)}>{children}</div>
		</div>
	)
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
