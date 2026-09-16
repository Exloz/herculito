# Herculito

Herculito tracks a person's physical activity, from planned gym work to sport sessions and timed recovery.

## Language

**Activity**:
A completed Workout Session or Sport Session that contributes to history, streaks, rankings, recent activity, and the calendar.
_Avoid_: Workout when referring to both gym and sport activity

**Workout Session**:
A gym session performed from a Routine, containing exercise progress such as sets, repetitions, and weight.
_Avoid_: Workout when the distinction from a Sport Session matters

**Sport Session**:
A session for a supported sport, currently Archery or HIIT, with sport-specific progress.
_Avoid_: Workout

**Active Activity**:
The Workout Session or Sport Session currently in progress for a User, including durable local progress that may not yet be synchronized.
Starting another activity replaces and abandons the previous one instead of blocking the User.
_Avoid_: Draft, temporary session

**Routine**:
A reusable plan of exercises for starting a Workout Session.
_Avoid_: Workout, template

**Timer Command**:
The latest instruction to schedule or cancel the single remote timer notification for a User's device.
_Avoid_: Job when describing user intent

**Body Measurement**:
A dated record of body values. An omitted value preserves the previous value during update; an explicit null clears it.
_Avoid_: Profile data
