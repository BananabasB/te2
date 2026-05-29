import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button'
export default function HomePage() {
  return (
    <div className="flex flex-col justify-center items-center text-center mx-auto max-w-120 gap-2 min-h-[calc(100dvh-4rem)]">
      <h1 className="text-4xl font-bold ">Just some docs</h1>
      <p>
        I was curious as to how The Escapists 2's code worked. So I had a peek. <br/>
        Here's what my agent documented on the source code.
      </p>
      <Link href="/docs" className={buttonVariants({ variant: 'primary' })}>View docs</Link>
    </div>
  );
}
