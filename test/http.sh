export LIVING_ROOM_URI=http://localhost:3000
http POST $LIVING_ROOM_URI/assert facts='mouse is cool'
http POST $LIVING_ROOM_URI/assert facts='mouse is also red'
http POST $LIVING_ROOM_URI/assert facts='mouse is a (1, 2, 3) circle at (5, 6) with radius 20'
http POST $LIVING_ROOM_URI/select facts:='["$mouseLabel is a ($r, $g, $b) circle at ($x, $y) with radius $radius", "$mouseLabel is cool"]'
