package fr.gamesonweb.lucid_arena_backend.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.IntStream;

@Component
public class BoardGenerator {
    private final Random random = new Random();
    // mêmes poids que votre front : 25% multi, 25% solo, 20% bonus, 30% malus
    private final List<String> types = List.of("multi","solo","bonus","malus");
    private final List<Double> cumulative = List.of(0.30, 0.60, 0.85, 1.0);

    public List<String> generate(int tileCount) {
        List<String> result = new ArrayList<>(tileCount);
        for (int i = 0; i < tileCount; i++) {
            double r = random.nextDouble();
            int idx = IntStream.range(0, cumulative.size())
                    .filter(j -> r < cumulative.get(j))
                    .findFirst()
                    .orElse(cumulative.size() - 1);
            result.add(types.get(idx));
        }
        return result;
    }
}

