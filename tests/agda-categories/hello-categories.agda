open import Agda.Builtin.Equality using (_≡_; refl)
open import Categories.Category using (Category)

Agda : Category _ _ _
Category.Obj       Agda = Set
Category._⇒_       Agda = λ A B → A → B
Category._≈_       Agda = _≡_
Category.id        Agda = λ x → x
Category._∘_       Agda = λ g f x → g (f x)
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
