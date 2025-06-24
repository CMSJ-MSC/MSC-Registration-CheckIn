check:
	git status
	git branch

start:
	node server.js

add:
	git status
	git add .
	git status

push:
	git push origin main

main:
	git pull origin main