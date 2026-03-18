import { ISelectMenuItem } from '../Shared/Props/selectMenuItem'
import {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandWrapper
} from '../../shadcn/command'
import React, { useCallback } from "react";
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import SelectItem from '../Shared/SelectItem';
import { SelectProps } from '../Shared/Props/SelectProps'
import { Modal, ModalContent } from '../../Modal/modalWithoutAnimation';
import SpinIcon from '../../Icons/spinIcon';

export interface CommandSelectProps extends SelectProps {
    show: boolean;
    setShow: (value: boolean) => void;
    searchHint: string;
    valueGrouper: (values: ISelectMenuItem[]) => SelectMenuItemGroup[];
    isLoading: boolean;
    modalContent?: React.ReactNode;
    header?: string;
}

export class SelectMenuItemGroup {
    constructor(init?: Partial<SelectMenuItemGroup>) {
        Object.assign(this, init);
    }

    name: string;
    items: ISelectMenuItem[];
}

export default function CommandSelect({ values, setValue, show, setShow, searchHint, valueGrouper, isLoading, modalContent, header }: CommandSelectProps) {
    const { isDesktop } = useWindowDimensions();

    let groups: SelectMenuItemGroup[] = valueGrouper(values);
    const handleSelectValue = useCallback((item: ISelectMenuItem) => {
        setValue(item);
        setShow(false);
    }, [setValue, setShow]);

    return (
        <Modal isOpen={show} setIsOpen={setShow}>
            <ModalContent header={header}>
                <CommandWrapper>
                    {searchHint && <CommandInput autoFocus={isDesktop} placeholder={searchHint} />}
                    {modalContent}
                    {!isLoading ?
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            {groups.filter(g => g.items?.length > 0).map((group) => {
                                return (
                                    <CommandGroup key={group.name} heading={group.name}>
                                        {group.items.map(item => {
                                            return (
                                                <CommandItem className='!rounded-xl -mx-1' value={item.id} key={item.id} onSelect={() => handleSelectValue(item)}>
                                                    <SelectItem item={item} />
                                                </CommandItem>
                                            )
                                        })
                                        }
                                    </CommandGroup>)
                            })}
                        </CommandList>
                        :
                        <div className='flex justify-center h-full items-center'>
                            <SpinIcon className="animate-spin h-5 w-5" />
                        </div>
                    }
                </CommandWrapper>
            </ModalContent>
        </Modal>
    )
}