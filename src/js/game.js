class Game {

    constructor() {
        G = this;

        G.setupNewGame();

        G.clock = 0;
        // G.promptClock = 0; // for reference

        // G.message = null; // for reference
        // G.messageProgress = 0; // for reference

        // G.missionStep = null; // for reference

        G.titleStickString = stickString(nomangle('everyone\'s'), 2 / 5);
        G.subtitleStickString = stickString(nomangle('sky'), 2 / 5);
        G.instructionsStickString = stickString(nomangle('press enter to start'), 2 / 5);

        G.titleCharWidth = G.subtitleCharWidth = 50;
        G.titleCharHeight = G.subtitleCharHeight = 100;

        G.startable = true;

        G.resourceIconOffsetY = 0;
        G.resourceIconScale = 1;
        G.resourceIconAlpha = 1;
        G.healthIconScale = 1;

        G.healthGaugeColor = '#fff';

        setTimeout(introSound, 1000);
    }

    proceedToMissionStep(missionStep) {
        if (G.missionStep) {
            G.missionStep.detach();
        }

        G.missionStep = missionStep;
        G.nextMission = 20;
        
        G.showPrompt();

        if (!missionStep) {
            return;
        }

        missionStep.proceedListener = missionStep => G.proceedToMissionStep(missionStep);
        missionStep.attach();
    }

    renderGauge(x, y, ratio, color, renderIcon) {
        wrap(() => {
            translate(x, y);

            R.fillStyle = 'rgba(128,128,128,0.5)';
            fr(0, -5, 200, 10);

            R.fillStyle = color;
            fr(0, -5, -2, 10);
            fr(200, -5, 2, 10);

            fr(0, -5, 200 * limit(0, ratio, 1), 10);

            translate(-25, 0);
            renderIcon();
        });
    }

    healAnimation(callback) {
        interp(G, 'resourceIconOffsetY', 0, -30, 0.3, 0, 0, () => {
            G.resourceIconOffsetY = 0;
        });

        interp(G, 'healthIconScale', 1, 2, 0.3, 0.2, 0, () => {
            interp(G, 'healthIconScale', 2, 1, 0.3, 0, 0, () => {
                G.healthGaugeColor = '#fff';
            });
        });

        setTimeout(() => G.healthGaugeColor = '#0f0', 200);

        interp(G, 'resourceIconScale', 1, 0, 0.3, 0, 0, () => {
            G.resourceIconScale = 1;
            callback();
        });

        interp(G, 'resourceIconAlpha', 1, 0, 0.3, 0, 0, () => {
            interp(G, 'resourceIconAlpha', 0, 1, 0.3, 0.3);
        });
    }

    resourceAnimation() {
        interp(G, 'resourceIconScale', 1, 2, 0.3, 0, 0, () => {
            interp(G, 'resourceIconScale', 2, 1, 0.3);
        });

        // interp(G, 'resourceIconAlpha', 1, 0, 0.3, 0, 0, () => {
        //     interp(G, 'resourceIconAlpha', 0, 1, 0.1);
        // });
    }

    cycle(e) {
        G.clock += e;

        if (G.started) {
            if ((G.nextMission -= e) <= 0) {
                G.promptRandomMission();
            }

            U.cycle(e);
            G.eventHub.emit(EVENT_CYCLE, e);
        }

        INTERPOLATIONS.slice().forEach(i => i.cycle(e));

        if (w.down[13] && G.startable) {
            G.start();
        }

        if (DEBUG) {
            G.renderedPlanets = 0;
            G.renderedOrbits = 0;
            G.renderedStars = 0;
            G.renderedAsteroids = 0;
            G.renderedShips = 0;
            G.renderedParticles = 0;
        }

        U.render();

        // Render HUD
        wrap(() => {
            translate(V.shakeX, V.shakeY);

            R.fillStyle = 'rgba(0,0,0,0.5)';
            R.strokeStyle = '#fff';
            fr(50, 30, 270, 100);
            strokeRect(50.5, 30.5, 270, 100);

            G.renderGauge(100, 50, U.playerShip.health, (U.playerShip.health < 0.25 || G.clock - U.playerShip.lastDamage < 0.2) ? '#f00' : G.healthGaugeColor, () => {
                scale(0.5 * G.healthIconScale, 0.5 * G.healthIconScale);
                beginPath();
                moveTo(0, -15)
                lineTo(14, -10);
                lineTo(10, 10);
                lineTo(0, 18);
                lineTo(-10, 10);
                lineTo(-14, -10);
                fill();
            });

            G.renderGauge(100, 80, U.playerShip.civilization.resources / PLANET_MAX_RESOURCES, '#fff', () => {
                R.globalAlpha = G.resourceIconAlpha;

                translate(0, G.resourceIconOffsetY);
                scale(0.3 * G.resourceIconScale, 0.3 * G.resourceIconScale);
                renderResourcesIcon();
            });

            G.renderGauge(100, 110, U.playerShip.heat, U.playerShip.coolingDown ? '#f00' : '#fff', () => {
                fr(-5, -5, 3, 10);
                fr(-1, -5, 3, 10);
                fr(3, -5, 3, 10);
            });

            // Rendering targets
            let targets = [];

            if (G.missionStep) {
                targets = G.missionStep.targets || [];
                // (G.missionStep.targets || []).forEach(target => wrap(() => {
                //     U.transformToCamera();

                //     R.lineWidth = 4;
                //     R.strokeStyle = '#fff';
                //     R.globalAlpha = 0.1;

                //     setLineDash([20, 20]);
                //     beginPath();
                //     moveTo(U.playerShip.x, U.playerShip.y);
                //     lineTo(target.x, target.y);
                //     stroke();
                // }));
            } else {
                const closestStars = U.stars.sort((a, b) => {
                    return dist(a, U.playerShip) - dist(b, U.playerShip);
                }).slice(0, 3);

                if (closestStars[0]) {
                    if (dist(closestStars[0], U.playerShip) > closestStars[0].reachRadius) {
                        targets = closestStars;
                    } else if (!closestStars[0].systemDiscovered) {
                        closestStars[0].systemDiscovered = true;
                        G.showMessage(nomangle('system discovered - ') + closestStars[0].name);
                        findSytemSound();
                    }
                }
            }
            
            targets.forEach(target => {
                if (dist(target, U.playerShip) < (target.reachRadius || 0)) {
                    return;
                }

                const angle = angleBetween(U.playerShip, target);

                wrap(() => {
                    const distanceOnCircle = limit(0, (dist(target, U.playerShip) - target.reachRadius) / 4000, 1) * 200 + 50;

                    translate(CANVAS_WIDTH / 2 + cos(angle) * distanceOnCircle, CANVAS_HEIGHT / 2 + sin(angle) * distanceOnCircle);
                    rotate(angle);

                    R.fillStyle = '#fff';
                    beginPath();
                    moveTo(0, 0);
                    lineTo(-14, 10);
                    lineTo(-8, 0);
                    lineTo(-14, -10);
                    fill();
                });
            });

            // Prompt
            const promptText = G.promptText();
            if (promptText) {
                R.fillStyle = 'rgba(0,0,0,0.5)';
                R.font = '20pt ' + monoFont;
                fr(0, CANVAS_HEIGHT - 200, CANVAS_WIDTH, 200);

                const textWidth = measureText(promptText + '_').width;

                const length = ~~min((G.clock - G.promptClock) * 20, promptText.length);
                const actualText = promptText.slice(0, length) + (length < promptText.length || (G.clock % 1) > 0.5 ? '_' : '');

                R.fillStyle = '#fff';
                R.textAlign = 'left';
                fillText(actualText, (CANVAS_WIDTH - textWidth) / 2, CANVAS_HEIGHT - 200 + 50);

                if (length >= promptText.length) {
                    R.textAlign = 'center';

                    G.promptOptions.forEach((option, i) => {
                        const step = CANVAS_WIDTH / (G.promptOptions.length + 1);
                        const x = (i + 1) * step;
                        fillText('[' + option.label.slice(0, 1) + ']' + option.label.slice(1), x, CANVAS_HEIGHT - 200 + 100);
                    });
                }
            }

            const currentWarning = U.playerShip.currentWarning();
            if (currentWarning) {
                R.fillStyle = 'rgba(255,0,0,0.5)';
                fr(0, 200, CANVAS_WIDTH, 125);

                R.font = '36pt Mono';
                R.textBaseline = 'middle';
                R.textAlign = 'center';
                R.fillStyle = '#fff';
                fillText(nomangle('/!\\ WARNING /!\\'), CANVAS_WIDTH / 2, 250);

                R.font = '18pt Mono';
                fillText(currentWarning, CANVAS_WIDTH / 2, 300);

                G.message = null; // don't want to have a warning and a message at the same time
            }

            R.strokeStyle = '#fff';
            R.lineCap = 'round';

            // Message
            if (G.message && G.messageProgress) {
                wrap(() => {
                    R.lineWidth = 4;

                    const messageWidth = G.message.width * 20;
                    translate((CANVAS_WIDTH - messageWidth) / 2, (CANVAS_HEIGHT - 100) / 2 - 200);
                    renderStickString(G.message, 20, 30, G.messageProgress, 0.1, 1);
                });
            }

            // Game title
            wrap(() => {
                translate(0, G.titleYOffset);

                R.fillStyle = '#000';
                fr(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                R.lineWidth = 8;

                const everyonesY = (CANVAS_HEIGHT - G.titleCharHeight * (G.titleStickString.height + 2 / 5 + G.subtitleStickString.height)) / 2;
                wrap(() => {
                    translate((CANVAS_WIDTH - G.titleStickString.width * G.titleCharWidth) / 2, everyonesY);
                    renderStickString(G.titleStickString, G.titleCharWidth, G.titleCharHeight, G.clock - 0.5, 0.1, 1);
                });

                wrap(() => {
                    R.lineWidth = G.subtitleCharThickness;
                    translate((CANVAS_WIDTH - G.subtitleStickString.width * G.subtitleCharWidth) / 2, everyonesY + G.titleCharHeight * G.subtitleStickString.height * 7 / 5);
                    renderStickString(G.subtitleStickString, G.subtitleCharWidth, G.subtitleCharHeight, G.clock - 0.5, 0.1 * (G.titleStickString.segments.length / G.subtitleStickString.segments.length), 1);
                });

                R.lineWidth = 4;

                const instructionCharWidth = 20;
                const instructionCharHeight = 30;
                wrap(() => {
                    if (G.clock % 1 > 0.5 && G.clock > 6 || G.titleYOffset) {
                        return;
                    }

                    translate((CANVAS_WIDTH - G.instructionsStickString.width * instructionCharWidth) / 2, CANVAS_HEIGHT - instructionCharHeight - 100);
                    renderStickString(G.instructionsStickString, instructionCharWidth, instructionCharHeight, G.clock - 5, 0.01, 0.2);
                });

                R.font = '20pt Mono';
                R.fillStyle = '#fff';
                R.textAlign = 'center';

                G.gameRecap.forEach((line, i) => {
                    fillText(line, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 3 / 4 - 50 + i * 30);    
                });
            });
        });

        if (DEBUG) {
            wrap(() => {
                R.font = '10pt ' + monoFont;
                R.fillStyle = '#fff';

                const info = [
                    'planets: ' + G.renderedPlanets,
                    'stars: ' + G.renderedStars,
                    'orbits: ' + G.renderedOrbits,
                    'asteroids: ' + G.renderedAsteroids,
                    'ships: ' + G.renderedShips,
                    'particles: ' + G.renderedParticles
                ];
                let y = 20; 
                info.forEach(info => {
                    fillText(info, CANVAS_WIDTH - 200, y);
                    y += 20;
                });
            });
        }
    }

    showPrompt(promptText, options) {
        G.promptText = promptText && promptText.call ? promptText : () => promptText;
        G.promptClock = G.clock;
        G.promptOptions = options || [];

        if (G.promptText()) {
            promptSound();
        }
    }

    selectPromptOption(character) {
        (G.promptOptions || []).forEach(option => {
            if (option.label.slice(0, 1).toLowerCase() === character.toLowerCase()) {
                option.action();
                selectSound();
            }
        });
    }

    showMessage(message) {
        G.message = stickString(message, 2 / 5);
        interp(G, 'messageProgress', G.message.segments.length, 0, G.message.segments.length * 0.1, 3);
        interp(G, 'messageProgress', 0, G.message.segments.length, G.message.segments.length * 0.1);
    }

    promptRandomMission() {
        // Missions only come from the closest planet
        const planet = U.bodies
            .filter(body => body.orbitsAround)
            .reduce((closest, body) => !closest || dist(U.playerShip, body) < dist(U.playerShip, closest) ? body : closest, null);

        if (planet && !G.missionStep) {
            const missionStep = pick([
                new AttackPlanet(pick(U.bodies.filter(body => body.orbitsAround === planet.orbitsAround && body !== planet))),
                new StudyBody(pick(U.bodies.filter(body => body.orbitsAround === planet.orbitsAround && body !== planet))),
                new CollectResources(),
                new Asteroids(),
                new Pirates()
            ]);
            missionStep.civilization = planet.civilization;

            G.proceedToMissionStep(new PromptMission(missionStep));

            for (let i = 0, d = max(planet.radius, dist(U.playerShip, planet) - V.width) ; d < dist(U.playerShip, planet) ; i++, d += 50) {
                const angle = angleBetween(planet, U.playerShip);
                const particle = {
                    'alpha': 0,
                    'render': () => wrap(() => {
                        R.strokeStyle = '#fff';
                        R.lineWidth = 2;
                        R.globalAlpha = particle.alpha;
                        beginPath();
                        arc(planet.x, planet.y, d, angle - PI / 16, angle + PI / 16);
                        stroke();

                        if (DEBUG) {
                            G.renderedParticles++;
                        }
                    })
                };
                U.particles.push(particle)

                interp(particle, 'alpha', 1, 0, 0.1, i * 0.02 + 0.2, 0, () => U.remove(U.particles, particle));
                interp(particle, 'alpha', 0, 1, 0.1, i * 0.02);
            }
        }

    }

    missionDone(success) {
        const missionStep = G.missionStep;
        G.proceedToMissionStep();

        missionStep.civilization.updateRelationship(success ? RELATIONSHIP_UPDATE_MISSION_SUCCESS : RELATIONSHIP_UPDATE_MISSION_FAILED);

        G.showPrompt(nomangle('Mission ') + (success ? nomangle('SUCCESS') : nomangle('FAILED')) + '. ' + missionStep.civilization.center.name.toUpperCase() + nomangle(' will remember that.'), [{
            'label': nomangle('Dismiss'),
            'action': () => G.showPrompt()
        }]);
    }

    start() {
        if (G.started) {
            return;
        }

        G.started = true;

        interp(G, 'titleYOffset', 0, -CANVAS_HEIGHT, 0.3);

        V.scale = V.targetScaleOverride = 1;
        setTimeout(() => G.proceedToMissionStep(new PromptTutorialStep()), 3000);
    }

    gameOver() {
        const civilizations = U.bodies
            .filter(body => body.civilization && body.civilization.relationshipType() != body.civilization.initialRelationship)
            .map(body => body.civilization);

        const enemiesMade = civilizations.filter(civilization => civilization.relationshipType() == RELATIONSHIP_ENEMY).length;
        const alliesMade = civilizations.filter(civilization => civilization.relationshipType() == RELATIONSHIP_ALLY).length;

        let subtitle;
        if (enemiesMade + alliesMade < GAME_RECAP_MIN_RELATIONSHIP_CHANGES) {
            subtitle = nomangle('you were barely noticed');
        } else if (abs(enemiesMade - alliesMade) < GAME_RECAP_RELATIONSHIP_CHANGES_NEUTRAL_THRESHOLD) {
            subtitle = nomangle('little has changed');
        } else if (enemiesMade > alliesMade) {
            subtitle = nomangle('you brought war');
        } else {
            subtitle = nomangle('you brought peace');
        }

        G.titleStickString = stickString(nomangle('game over'), 2 / 5);
        G.subtitleStickString = stickString(subtitle, 2 / 5);
        G.instructionsStickString = stickString(nomangle('press enter to try again'), 2 / 5);

        G.subtitleCharWidth = 25;
        G.subtitleCharHeight = 50;
        G.subtitleCharThickness = 6

        G.startable = G.started = false;

        G.clock = 0;

        interp(G, 'titleYOffset', -CANVAS_HEIGHT, 0, 0.3, 0, 0, () => G.setupNewGame());

        setTimeout(() => {
            G.gameRecap = [
                enemiesMade + nomangle(' planets have declared war against us.'),
                alliesMade + nomangle(' species are now our allies.')
            ];
            G.startable = true;
        }, 4000);
    }

    setupNewGame() {
        U = new Universe();
        V = new Camera();

        G.eventHub = new EventHub();

        G.promptText = () => 0;
        
        G.started = false;

        G.titleYOffset = 0;

        G.missionStep = 0;
        G.nextMission = 999;
        
        G.gameRecap = [];
    }

}