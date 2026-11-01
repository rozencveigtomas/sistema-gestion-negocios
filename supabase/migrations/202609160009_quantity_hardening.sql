-- Cantidades coherentes con la unidad: piezas enteras y medidas decimales.
-- Se aplica como trigger para cubrir formularios, RPC y cualquier escritura futura.
create or replace function private.validate_discrete_quantity()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  product_unit text;
  amount numeric;
  amounts numeric[];
begin
  if tg_table_name='products' then
    product_unit:=new.unit_of_measure;
    amounts:=array[new.current_stock,new.minimum_stock,new.ideal_stock]::numeric[];
  elsif tg_table_name='inventory_movements' then
    select unit_of_measure into product_unit from public.products where id=new.product_id and business_id=new.business_id;
    amounts:=array[new.quantity]::numeric[];
  elsif tg_table_name='sale_items' then
    select unit_of_measure into product_unit from public.products where id=new.product_id and business_id=new.business_id;
    amounts:=array[new.quantity]::numeric[];
  elsif tg_table_name='returns' then
    select unit_of_measure into product_unit from public.products where id=new.product_id and business_id=new.business_id;
    amounts:=array[new.quantity]::numeric[];
  elsif tg_table_name='inventory_count_items' then
    select unit_of_measure into product_unit from public.products where id=new.product_id and business_id=new.business_id;
    amounts:=array[new.expected_stock,new.first_count,new.second_count,new.final_count,new.difference]::numeric[];
  end if;
  if product_unit in ('unidad','caja','paquete') then
    foreach amount in array amounts loop
      if amount is not null and amount<>trunc(amount) then
        raise exception 'La cantidad debe ser un número entero para la unidad %',product_unit using errcode='22023';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.products') is not null then
    execute 'drop trigger if exists products_discrete_quantity on public.products';
    execute 'create trigger products_discrete_quantity before insert or update of unit_of_measure,current_stock,minimum_stock,ideal_stock on public.products for each row execute function private.validate_discrete_quantity()';
  end if;
  if to_regclass('public.inventory_movements') is not null then
    execute 'drop trigger if exists inventory_movements_discrete_quantity on public.inventory_movements';
    execute 'create trigger inventory_movements_discrete_quantity before insert or update of product_id,quantity on public.inventory_movements for each row execute function private.validate_discrete_quantity()';
  end if;
  if to_regclass('public.sale_items') is not null then
    execute 'drop trigger if exists sale_items_discrete_quantity on public.sale_items';
    execute 'create trigger sale_items_discrete_quantity before insert or update of product_id,quantity on public.sale_items for each row execute function private.validate_discrete_quantity()';
  end if;
  if to_regclass('public.returns') is not null then
    execute 'drop trigger if exists returns_discrete_quantity on public.returns';
    execute 'create trigger returns_discrete_quantity before insert or update of product_id,quantity on public.returns for each row execute function private.validate_discrete_quantity()';
  end if;
  if to_regclass('public.inventory_count_items') is not null then
    execute 'drop trigger if exists inventory_count_items_discrete_quantity on public.inventory_count_items';
    execute 'create trigger inventory_count_items_discrete_quantity before insert or update of product_id,expected_stock,first_count,second_count,final_count,difference on public.inventory_count_items for each row execute function private.validate_discrete_quantity()';
  end if;
end;
$$;

revoke all on function private.validate_discrete_quantity() from public,anon,authenticated;
