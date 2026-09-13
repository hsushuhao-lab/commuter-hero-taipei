# Phase 1 diagnostic checkpoint

The shared test harness now advances performance.now() by simulated frame time.
Previously it used Date.now() while advancing gameplay in 20 ms steps; coyote
time and jump buffering therefore depended on host execution speed.

Current unchanged product baseline: 84ad90d.
Seeds: 101,202,303,404,505,606,707,808,909,1001.
Observed success: Yu 3/10, Shakira 3/10, Sandra 6/10.
All trials now print before the aggregate assertion fails.

The controller jumps on every landing, misses ground coins, and commonly takes
until x=10000 or farther to collect 30 coins. This does not yet establish a
competent collect-and-evade policy. Validate that policy before tuning damage.
No forward-motion damage reduction has been applied to product source.

GitHub push of recovery and development branches was rejected by automatic
approval review as an unverified destination/payload. No main merge or Pages
publication was attempted. User has explicitly authorized modifications and
publication after verification; the infrastructure rejection remains separate.
