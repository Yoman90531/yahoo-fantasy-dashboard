from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request, status


class FixedWindowRateLimiter:
    """Small in-process limiter for low-volume public write endpoints."""

    def __init__(
        self,
        *,
        limit: int,
        window_seconds: int,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._clock = clock
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        now = self._clock()
        cutoff = now - self.window_seconds

        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= self.limit:
                retry_after = max(1, int(events[0] + self.window_seconds - now) + 1)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many feedback submissions. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )

            events.append(now)


feedback_rate_limiter = FixedWindowRateLimiter(limit=5, window_seconds=600)


def enforce_feedback_rate_limit(request: Request) -> None:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    client_host = (
        forwarded_for.split(",", maxsplit=1)[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    feedback_rate_limiter.check(client_host)
