open import Agda.Builtin.Equality using (_≡_; refl)
open import Categories.Category using (Category)

_⇒_ : Set → Set → Set
A ⇒ B = A → B

id : ∀ {A} → A ⇒ A
id x = x

_∘_ : ∀ {A B C} → B ⇒ C → A ⇒ B → A ⇒ C
(g ∘ f) x = g (f x)

Agda : Category _ _ _
Category.Obj       Agda = Set
Category._⇒_       Agda = _⇒_
Category._≈_       Agda = _≡_
Category.id        Agda = id
Category._∘_       Agda = _∘_
Category.assoc     Agda = refl
Category.sym-assoc Agda = refl
Category.identityˡ Agda = refl
Category.identityʳ Agda = refl
Category.identity² Agda = refl
Category.equiv     Agda = record
  { refl  = refl
  ; sym   = λ { refl → refl }
  ; trans = λ { refl refl → refl }
  }
Category.∘-resp-≈  Agda = λ { refl refl → refl }
