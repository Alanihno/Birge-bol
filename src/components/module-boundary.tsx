import { Component } from 'react';
import type { ReactNode } from 'react';
import { ErrorState } from './ui';
export class ModuleBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<ErrorState retry={()=>this.setState({failed:false})}/>:this.props.children;}
}
