import { FileUpload } from '@/components/FileUpload'

export default function Home() {
	return (
		<main>
			<h1 className="text-foreground text-center text-2xl font-bold">Hello World</h1>
			<div className="flex flex-col items-center justify-center h-screen">
				<FileUpload />
			</div>
		</main>
	)
}
