'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center group', className)}
    {...props}
  >
    {/* Track — тёмный в светлой теме */}
    <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-black/10">
      <SliderPrimitive.Range className="absolute h-full bg-primary rounded-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-3.5 w-3.5 rounded-full bg-white shadow-md shadow-black/20
                 ring-2 ring-primary/60
                 transition-transform duration-150
                 focus-visible:outline-none
                 disabled:pointer-events-none disabled:opacity-50
                 active:scale-125 group-hover:scale-110"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
