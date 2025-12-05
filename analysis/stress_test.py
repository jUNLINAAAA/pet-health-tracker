"""
Comprehensive Stress Test for Health Score Algorithm V4

Tests algorithm accuracy across ALL species, breeds, and edge cases.
Validates scoring is realistic and consistent with veterinary standards.

Author: Total-H3 Team
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Tuple

# =============================================================================
# BREED WEIGHTS (matches Edge Function V4)
# =============================================================================

BREED_WEIGHTS = {
    # DOGS
    'Golden Retriever': (25, 34),
    'Labrador Retriever': (25, 36),
    'German Shepherd': (30, 40),
    'Border Collie': (14, 20),
    'Beagle': (9, 11),
    'Bulldog': (18, 23),
    'French Bulldog': (8, 14),
    'Poodle': (20, 32),
    'Chihuahua': (1.5, 3),
    'Husky': (16, 27),
    'Corgi': (10, 14),
    'Dachshund': (7, 14),
    'Boxer': (25, 32),
    'Rottweiler': (36, 54),
    'Great Dane': (50, 79),
    'Yorkshire Terrier': (2, 3.2),
    'Shih Tzu': (4, 7),
    'Pug': (6, 8),
    'Pit Bull': (14, 27),
    'Mastiff': (54, 100),
    # CATS
    'Siamese': (3, 5),
    'Persian': (3, 5.5),
    'Maine Coon': (5.5, 11),
    'British Shorthair': (4, 8),
    'Bengal': (4, 7),
    'Ragdoll': (4.5, 9),
    'Domestic Shorthair': (3.5, 5),
    # RABBITS
    'Holland Lop': (1.3, 1.8),
    'Netherland Dwarf': (0.9, 1.1),
    'Flemish Giant': (5, 10),
}

SPECIES_DEFAULTS = {
    'Dog': (10, 30),
    'Cat': (3.5, 5.5),
    'Bird': (0.03, 0.5),
    'Rabbit': (1.5, 3),
    'Hamster': (0.03, 0.15),
    'Guinea Pig': (0.7, 1.2),
}

# =============================================================================
# THRESHOLD-BASED WEIGHT SCORING (matches Edge Function V4)
# =============================================================================

def calculate_weight_score(weight: float, breed: str, species: str = 'Dog') -> Dict:
    """Calculate weight score using threshold-based algorithm (V4)."""

    # Get ideal range
    if breed in BREED_WEIGHTS:
        min_w, max_w = BREED_WEIGHTS[breed]
    elif species in SPECIES_DEFAULTS:
        min_w, max_w = SPECIES_DEFAULTS[species]
    else:
        min_w, max_w = 10, 30

    ideal = (min_w + max_w) / 2

    if weight >= min_w and weight <= max_w:
        # Within healthy range
        distance_from_ideal = abs(weight - ideal)
        range_size = max_w - min_w
        score = 100 - (distance_from_ideal / range_size) * 15
        status = 'ideal'
    elif weight < min_w:
        # Underweight
        deficit = min_w - weight
        deficit_percent = (deficit / min_w) * 100

        if deficit_percent > 30:
            score = max(15, 30 - deficit_percent / 2)
            status = 'severely_underweight'
        elif deficit_percent > 15:
            score = max(30, 60 - deficit_percent)
            status = 'underweight'
        else:
            score = max(50, 80 - deficit_percent * 2)
            status = 'slightly_underweight'
    else:
        # Overweight
        excess = weight - max_w
        excess_percent = (excess / max_w) * 100

        if excess_percent > 50:
            score = max(10, 25 - excess_percent / 5)
            status = 'morbidly_obese'
        elif excess_percent > 25:
            score = max(25, 50 - excess_percent)
            status = 'obese'
        elif excess_percent > 10:
            score = max(40, 70 - excess_percent * 1.5)
            status = 'overweight'
        else:
            score = max(60, 85 - excess_percent * 2)
            status = 'slightly_overweight'

    return {
        'score': round(score),
        'status': status,
        'weight': weight,
        'ideal_range': (min_w, max_w),
        'ideal': ideal,
        'deviation': round(weight - ideal, 2),
    }


# =============================================================================
# TEST CASES
# =============================================================================

@dataclass
class TestCase:
    name: str
    species: str
    breed: str
    weight: float
    expected_status: str
    expected_score_range: Tuple[int, int]
    notes: str


# Comprehensive test cases across all species and conditions
TEST_CASES = [
    # === DOGS - Normal weight ===
    TestCase("Golden Retriever - Ideal", "Dog", "Golden Retriever", 29.5, "ideal", (92, 100), "Center of range"),
    TestCase("Golden Retriever - Low ideal", "Dog", "Golden Retriever", 25.0, "ideal", (85, 100), "At min ideal"),
    TestCase("Golden Retriever - High ideal", "Dog", "Golden Retriever", 34.0, "ideal", (85, 100), "At max ideal"),
    TestCase("Labrador - Ideal", "Dog", "Labrador Retriever", 30.0, "ideal", (92, 100), "Center of range"),
    TestCase("German Shepherd - Ideal", "Dog", "German Shepherd", 35.0, "ideal", (92, 100), "Center of range"),
    TestCase("Chihuahua - Ideal", "Dog", "Chihuahua", 2.25, "ideal", (92, 100), "Center of range"),
    TestCase("Great Dane - Ideal", "Dog", "Great Dane", 65.0, "ideal", (92, 100), "Center of range"),

    # === DOGS - Slightly overweight (common real-world case) ===
    TestCase("Golden Retriever - 38kg", "Dog", "Golden Retriever", 38.0, "overweight", (40, 60), "4kg over max (~12%)"),
    TestCase("Beagle - 13kg", "Dog", "Beagle", 13.0, "overweight", (40, 55), "2kg over max (~18%)"),
    TestCase("Pug - 10kg", "Dog", "Pug", 10.0, "overweight", (35, 50), "2kg over max (25%)"),

    # === DOGS - Obese ===
    TestCase("Golden Retriever - 45kg", "Dog", "Golden Retriever", 45.0, "obese", (20, 40), "32% over max"),
    TestCase("Chihuahua - 5kg", "Dog", "Chihuahua", 5.0, "obese", (15, 35), "67% over max"),

    # === DOGS - Morbidly obese ===
    TestCase("Golden Retriever - 55kg", "Dog", "Golden Retriever", 55.0, "morbidly_obese", (10, 25), "62% over max"),
    TestCase("Beagle - 20kg", "Dog", "Beagle", 20.0, "morbidly_obese", (10, 20), "82% over max"),

    # === DOGS - Underweight ===
    TestCase("Golden Retriever - 23kg", "Dog", "Golden Retriever", 23.0, "slightly_underweight", (60, 80), "8% under min"),
    TestCase("German Shepherd - 25kg", "Dog", "German Shepherd", 25.0, "underweight", (40, 60), "17% under min"),
    TestCase("Labrador - 18kg", "Dog", "Labrador Retriever", 18.0, "severely_underweight", (10, 30), "28% under min"),

    # === CATS ===
    TestCase("Siamese - Ideal", "Cat", "Siamese", 4.0, "ideal", (92, 100), "Center of range"),
    TestCase("Maine Coon - Ideal", "Cat", "Maine Coon", 8.0, "ideal", (92, 100), "Center of range"),
    TestCase("Persian - Overweight", "Cat", "Persian", 7.0, "overweight", (35, 55), "27% over max"),
    TestCase("British Shorthair - Obese", "Cat", "British Shorthair", 12.0, "obese", (20, 40), "50% over max"),
    TestCase("Domestic Shorthair - Underweight", "Cat", "Domestic Shorthair", 2.5, "underweight", (40, 60), "29% under min"),

    # === RABBITS ===
    TestCase("Holland Lop - Ideal", "Rabbit", "Holland Lop", 1.5, "ideal", (90, 100), "Center of range"),
    TestCase("Flemish Giant - Ideal", "Rabbit", "Flemish Giant", 7.5, "ideal", (92, 100), "Center of range"),
    TestCase("Netherland Dwarf - Overweight", "Rabbit", "Netherland Dwarf", 1.5, "obese", (15, 35), "36% over max"),

    # === EDGE CASES ===
    TestCase("Small Dog - Border", "Dog", "Chihuahua", 3.0, "ideal", (85, 100), "Exactly at max"),
    TestCase("Large Dog - Border", "Dog", "Mastiff", 100.0, "ideal", (85, 100), "Exactly at max"),
    TestCase("Unknown Breed Dog", "Dog", "Mixed", 20.0, "ideal", (85, 100), "Uses species default"),
]


def run_stress_tests():
    """Run all stress tests and report results."""

    print("=" * 80)
    print("HEALTH SCORE ALGORITHM V4 - STRESS TEST REPORT")
    print("=" * 80)
    print()

    passed = 0
    failed = 0
    results = []

    for test in TEST_CASES:
        result = calculate_weight_score(test.weight, test.breed, test.species)

        score_in_range = test.expected_score_range[0] <= result['score'] <= test.expected_score_range[1]
        status_match = result['status'] == test.expected_status

        if score_in_range and status_match:
            status = "✓ PASS"
            passed += 1
        elif score_in_range or status_match:
            status = "~ CLOSE"
            passed += 0.5
            failed += 0.5
        else:
            status = "✗ FAIL"
            failed += 1

        results.append({
            'test': test,
            'result': result,
            'status': status,
            'score_in_range': score_in_range,
            'status_match': status_match,
        })

        print(f"{test.name}")
        print(f"  Weight: {test.weight}kg | Breed: {test.breed}")
        print(f"  Score: {result['score']} (expected {test.expected_score_range[0]}-{test.expected_score_range[1]}) | {status}")
        print(f"  Status: {result['status']} (expected {test.expected_status})")
        print(f"  Ideal Range: {result['ideal_range'][0]}-{result['ideal_range'][1]}kg | Deviation: {result['deviation']:+.1f}kg")
        print()

    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    total = len(TEST_CASES)
    accuracy = (passed / total) * 100

    print(f"Total Tests: {total}")
    print(f"Passed: {int(passed)}")
    print(f"Close: {int((passed - int(passed)) * 2)}")
    print(f"Failed: {int(failed)}")
    print(f"Accuracy: {accuracy:.1f}%")
    print()

    # Species breakdown
    print("BY SPECIES:")
    species_results = {}
    for r in results:
        species = r['test'].species
        if species not in species_results:
            species_results[species] = {'passed': 0, 'total': 0}
        species_results[species]['total'] += 1
        if r['status'] == "✓ PASS":
            species_results[species]['passed'] += 1
        elif r['status'] == "~ CLOSE":
            species_results[species]['passed'] += 0.5

    for species, data in species_results.items():
        pct = (data['passed'] / data['total']) * 100
        print(f"  {species}: {pct:.0f}% ({int(data['passed'])}/{data['total']})")

    print()

    # Realistic scenarios check
    print("REAL-WORLD SCENARIO VALIDATION:")
    scenarios = [
        ("38kg Golden Retriever (common overweight)", "Golden Retriever", 38, 40, 70),
        ("13kg Beagle (common overweight)", "Beagle", 13, 35, 60),
        ("6kg Persian cat (slightly overweight)", "Persian", 6, 55, 80),
        ("8kg Maine Coon (ideal for large cat)", "Maine Coon", 8, 85, 100),
        ("2kg Chihuahua (ideal small dog)", "Chihuahua", 2, 85, 100),
    ]

    for name, breed, weight, min_score, max_score in scenarios:
        result = calculate_weight_score(weight, breed)
        in_range = min_score <= result['score'] <= max_score
        status = "✓" if in_range else "✗"
        print(f"  {status} {name}: {result['score']} (expected {min_score}-{max_score})")

    print()
    return accuracy


def test_boundary_conditions():
    """Test boundary conditions and edge cases."""

    print("=" * 80)
    print("BOUNDARY CONDITION TESTS")
    print("=" * 80)
    print()

    # Test exact boundaries
    boundaries = [
        ("At min boundary", "Golden Retriever", 25.0, 85, 100),
        ("At max boundary", "Golden Retriever", 34.0, 85, 100),
        ("Just below min", "Golden Retriever", 24.9, 70, 85),
        ("Just above max", "Golden Retriever", 34.1, 70, 85),
        ("10% over max", "Golden Retriever", 37.4, 55, 75),
        ("25% over max", "Golden Retriever", 42.5, 25, 50),
        ("50% over max", "Golden Retriever", 51.0, 10, 25),
    ]

    all_pass = True
    for name, breed, weight, min_score, max_score in boundaries:
        result = calculate_weight_score(weight, breed)
        in_range = min_score <= result['score'] <= max_score
        status = "✓" if in_range else "✗"
        if not in_range:
            all_pass = False
        print(f"  {status} {name}: {weight}kg → {result['score']} (expected {min_score}-{max_score})")

    print()
    return all_pass


def test_all_breeds():
    """Test all supported breeds with ideal weight."""

    print("=" * 80)
    print("ALL BREEDS - IDEAL WEIGHT TEST")
    print("=" * 80)
    print()

    all_pass = True
    for breed, (min_w, max_w) in BREED_WEIGHTS.items():
        ideal = (min_w + max_w) / 2
        result = calculate_weight_score(ideal, breed)

        # Ideal weight should score 92-100
        in_range = 92 <= result['score'] <= 100
        status = "✓" if in_range else "✗"
        if not in_range:
            all_pass = False

        print(f"  {status} {breed}: {ideal}kg → {result['score']}")

    print()
    return all_pass


if __name__ == "__main__":
    accuracy = run_stress_tests()
    boundary_pass = test_boundary_conditions()
    all_breeds_pass = test_all_breeds()

    print("=" * 80)
    print("FINAL RESULTS")
    print("=" * 80)
    print(f"Overall Accuracy: {accuracy:.1f}%")
    print(f"Boundary Tests: {'PASS' if boundary_pass else 'FAIL'}")
    print(f"All Breeds Test: {'PASS' if all_breeds_pass else 'FAIL'}")
    print()

    if accuracy >= 90 and boundary_pass and all_breeds_pass:
        print("✓ ALGORITHM VALIDATED - Ready for production")
    elif accuracy >= 80:
        print("~ ALGORITHM ACCEPTABLE - Minor adjustments recommended")
    else:
        print("✗ ALGORITHM NEEDS WORK - Review scoring thresholds")
