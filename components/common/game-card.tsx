import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface GameCardItem {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  badge?: string;
  icon: ReactNode;
}

export function GameCardGrid({ games }: { games: GameCardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <Card
          key={game.id}
          className="flex flex-col justify-between transition-colors hover:border-primary/40"
        >
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {game.icon}
              </div>
              {game.badge && <Badge variant="secondary">{game.badge}</Badge>}
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-lg">{game.title}</CardTitle>
              <CardDescription className="leading-relaxed">
                {game.description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full justify-between">
              <Link href={game.href}>
                <span>{game.ctaLabel}</span>
                <ArrowRightIcon />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
